/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { DATA_QUALITY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import * as t from 'io-ts';
import type {
  IndicesGetMappingIndexMappingRecord,
  IndicesStatsResponse,
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  MsearchRequestItem,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import has from 'lodash/has';
import { EcsFlat } from '@kbn/ecs';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { CompleteRule, DataQualityRuleParams, RuleParams } from '../../rule_schema';
import { dataQualityRuleParams } from '../../rule_schema';
import type { CreateRuleOptions, SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';

import { createSearchAfterReturnType, getUnprocessedExceptionsWarnings } from '../../signals/utils';
import { createEnrichEventsFunction } from '../../signals/enrichments';
import { buildAlert } from '../factories/utils/build_alert';

// TODO move all this to separate files
export const AllowedValues = t.array(
  t.partial({
    description: t.string,
    name: t.string,
  })
);

export type AllowedValuesInputs = t.TypeOf<typeof AllowedValues>;

export const GetUnallowedFieldValuesBody = t.array(
  t.type({
    indexName: t.string,
    indexFieldName: t.string,
    allowedValues: AllowedValues,
    from: t.string,
    to: t.string,
  })
);

export type GetUnallowedFieldValuesInputs = t.TypeOf<typeof GetUnallowedFieldValuesBody>;

export const getMSearchRequestHeader = (indexName: string): MsearchMultisearchHeader => ({
  expand_wildcards: ['open'],
  index: indexName,
});

export const getMSearchRequestBody = ({
  indexFieldName,
  allowedValues,
  from,
  to,
}: {
  indexFieldName: string;
  allowedValues: AllowedValuesInputs;
  from: string;
  to: string;
}): MsearchMultisearchBody => ({
  aggregations: {
    unallowedValues: {
      terms: {
        field: indexFieldName,
        order: {
          _count: 'desc',
        },
      },
    },
  },
  query: {
    bool: {
      filter: [
        {
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not:
              allowedValues.length > 0
                ? [
                    {
                      bool: {
                        should: allowedValues.map(({ name: allowedValue }) => ({
                          match_phrase: {
                            [indexFieldName]: allowedValue,
                          },
                        })),
                        minimum_should_match: 1,
                      },
                    },
                  ]
                : [],
          },
        },
        {
          range: {
            '@timestamp': {
              gte: from,
              lte: to,
            },
          },
        },
      ],
    },
  },
  runtime_mappings: {},
  size: 0,
});

export const getUnallowedFieldValues = (
  esClient: ElasticsearchClient,
  items: GetUnallowedFieldValuesInputs
) => {
  const searches: MsearchRequestItem[] = items.reduce<MsearchRequestItem[]>(
    (acc, { indexName, indexFieldName, allowedValues, from, to }) =>
      acc.concat([
        getMSearchRequestHeader(indexName),
        getMSearchRequestBody({ indexFieldName, allowedValues, from, to }),
      ]),
    []
  );

  return esClient.msearch({
    searches,
  });
};

export const fetchStats = async (
  client: ElasticsearchClient,
  indices: string[]
): Promise<IndicesStatsResponse> =>
  client.indices.stats({
    expand_wildcards: ['open'],
    index: indices,
  });

export const fetchMappings = async (
  client: ElasticsearchClient,
  indexPatterns: string[]
): Promise<Record<string, IndicesGetMappingIndexMappingRecord>> =>
  client.indices.getMapping({
    expand_wildcards: ['open'],
    index: indexPatterns,
  });

export interface FieldType {
  field: string;
  type: string;
}

function shouldReadKeys(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const getNextPathWithoutProperties = ({
  key,
  pathWithoutProperties,
  value,
}: {
  key: string;
  pathWithoutProperties: string;
  value: unknown;
}): string => {
  if (!pathWithoutProperties) {
    return key;
  }

  if (shouldReadKeys(value) && key === 'properties') {
    return `${pathWithoutProperties}`; // TODO: wrap required?
  } else {
    return `${pathWithoutProperties}.${key}`;
  }
};

export function getFieldTypes(mappingsProperties: Record<string, unknown>): FieldType[] {
  if (!shouldReadKeys(mappingsProperties)) {
    throw new TypeError(`Root value is not flatten-able, received ${mappingsProperties}`);
  }

  const result: FieldType[] = [];

  (function flatten(prefix, object, pathWithoutProperties) {
    for (const [key, value] of Object.entries(object)) {
      const path = prefix ? `${prefix}.${key}` : key;

      const nextPathWithoutProperties = getNextPathWithoutProperties({
        key,
        pathWithoutProperties,
        value,
      });

      if (shouldReadKeys(value)) {
        flatten(path, value, nextPathWithoutProperties);
      } else {
        if (nextPathWithoutProperties.endsWith('.type')) {
          const pathWithoutType = nextPathWithoutProperties.slice(
            0,
            nextPathWithoutProperties.lastIndexOf('.type')
          );

          result.push({
            field: pathWithoutType,
            type: `${value}`,
          });
        }
      }
    }
  })('', mappingsProperties, '');

  return result;
}

// END files TODO

const runDataQualityCheck = async (
  es: ElasticsearchClient,
  indexPatterns: string[],
  from: string,
  to: string
) => {
  const mappingRequestResult = await fetchMappings(es, indexPatterns);

  const inputs: GetUnallowedFieldValuesInputs = [];

  for (const indexName in mappingRequestResult) {
    if (has(mappingRequestResult, indexName)) {
      const {
        [indexName]: {
          mappings: { properties },
        },
      } = mappingRequestResult;

      const fields = getFieldTypes(properties as Record<string, unknown>);

      const fieldsWithAllowedValuesSpecified = fields
        .map((field) => ({
          ...field,
          allowedValues: (EcsFlat as Record<string, { allowed_values?: unknown[] }>)[field.field]
            ?.allowed_values,
        }))
        .filter((field) => field.allowedValues);

      inputs.push(
        ...(fieldsWithAllowedValuesSpecified.map((field) => ({
          indexName,
          allowedValues: field.allowedValues,
          indexFieldName: field.field,
          from,
          to,
        })) as GetUnallowedFieldValuesInputs)
      );
    }
  }

  const results = await getUnallowedFieldValues(es, inputs);

  // eslint-disable-next-line no-console
  console.log(`getUnallowedFieldValues ${JSON.stringify(results, null, 2)}`);
};

interface BuildAlertsParams {
  spaceId: string;
  index: string[];
  completeRule: CompleteRule<RuleParams>;
}

interface FieldIssue {
  index: string;
  description: string;
}

const buildAlerts = ({ spaceId, completeRule, index }: BuildAlertsParams, issues: FieldIssue[]) => {
  const id = `${Date.now()}`;

  const baseAlert = buildAlert([], completeRule, spaceId, 'reason blabla', index, undefined);

  return [
    {
      _id: id,
      _index: '',
      _source: {
        ...baseAlert,
        // [ALERT_NEW_TERMS]: eventAndTerms.newTerms,
        [ALERT_UUID]: id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    },
  ];
};

export const createDataQualityAlertType = (
  _createOptions: CreateRuleOptions
): SecurityAlertType<DataQualityRuleParams, {}, {}, 'default'> => {
  return {
    id: DATA_QUALITY_RULE_TYPE_ID,
    name: 'Data Quality',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, dataQualityRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
        /**
         * validate rule params when rule is bulk edited (update and created in future as well)
         * returned params can be modified (useful in case of version increment)
         * @param mutatedRuleParams
         * @returns mutatedRuleParams
         */
        validateMutatedParams: (mutatedRuleParams) => {
          validateIndexPatterns(mutatedRuleParams.index);

          return mutatedRuleParams;
        },
      },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: { ruleExecutionLogger, unprocessedExceptions, bulkCreate, completeRule },
        services,
        state,
        rule: {
          schedule: { interval },
        },
        params: { index = ['filebeat-*'], from, to, maxSignals },
        spaceId,
      } = execOptions;

      ruleExecutionLogger.info(
        `Data quality scanning ${index.join()} interval=${interval} from=${from} to=${to}`
      );
      const esClient = services.scopedClusterClient.asCurrentUser;

      // TODO check types like that

      /*
      
       isEcsCompliant: type === ecsMetadata[field].type && indexInvalidValues.length === 0,

       */

      try {
        await runDataQualityCheck(esClient, index, from, to);

        const bulkCreateResult = await bulkCreate(
          buildAlerts({ spaceId, completeRule, index }, []),
          maxSignals, // TODO adjust this
          createEnrichEventsFunction({
            services,
            logger: ruleExecutionLogger,
          })
        );

        // eslint-disable-next-line no-console
        console.log(bulkCreateResult);

        // TODO remove changes to x-pack/plugins/threat_intelligence folder
      } catch (error: unknown) {
        console.error(error);
        if (error instanceof Error) {
          ruleExecutionLogger.error(error.message);
        }
      }

      const result = createSearchAfterReturnType();
      const exceptionsWarning = getUnprocessedExceptionsWarnings(unprocessedExceptions);
      if (exceptionsWarning) {
        result.warningMessages.push(exceptionsWarning);
      }

      return { ...result, state };
    },
  };
};
