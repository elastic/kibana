/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { DATA_QUALITY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import type { MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { SERVER_APP_ID } from '../../../../../common/constants';

import type { DataQualityRuleParams } from '../../rule_schema';
import { dataQualityRuleParams } from '../../rule_schema';
import type { CreateRuleOptions, SecurityAlertType } from '../types';
import { validateIndexPatterns } from '../utils';

import { createSearchAfterReturnType, getUnprocessedExceptionsWarnings } from '../../signals/utils';
import { createEnrichEventsFunction } from '../../signals/enrichments';
import type { GetUnallowedFieldValuesInputs } from './types';
import { getMSearchRequestHeader } from './get_msearch_request_header';
import { getMSearchRequestBody } from './get_msearch_request_body';
import { buildAlerts } from './build_alerts';
import { runDataQualityCheck } from './run_data_quality_check';

export const getUnallowedFieldValues = async (
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

  const { responses } = await esClient.msearch({
    searches,
  });

  return {
    responses: responses.map((resp, i) => ({ ...resp, indexName: items[i].indexName })),
  };
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
        params: { index = [], from, to, maxSignals },
        spaceId,
      } = execOptions;

      ruleExecutionLogger.info(
        `Data quality checking indices ${index.join()}, interval=${interval} from=${from} to=${to}`
      );
      const esClient = services.scopedClusterClient.asCurrentUser;

      try {
        const qualityCheckResults = await runDataQualityCheck(esClient, index, from, to);

        if (qualityCheckResults.length) {
          const alertCreationResult = await bulkCreate(
            buildAlerts({ spaceId, completeRule, index }, qualityCheckResults),
            maxSignals, // TODO adjust this
            createEnrichEventsFunction({
              services,
              logger: ruleExecutionLogger,
            })
          );

          ruleExecutionLogger.info(`${alertCreationResult.createdItemsCount} alerts created`);
        }

        // TODO remove changes to x-pack/plugins/threat_intelligence folder
      } catch (error: unknown) {
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
