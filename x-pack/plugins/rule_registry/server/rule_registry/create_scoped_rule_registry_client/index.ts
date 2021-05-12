/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Either, isLeft, isRight } from 'fp-ts/lib/Either';
import { Errors } from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { Logger } from 'kibana/server';
import { IScopedClusterClient as ScopedClusterClient } from 'src/core/server';
import { castArray, compact } from 'lodash';
import { ESSearchRequest } from 'typings/elasticsearch';
import { IndexPatternsFetcher } from '../../../../../../src/plugins/data/server';
import { ClusterClientAdapter } from '../../../../event_log/server';
import { TypeOfFieldMap } from '../../../common';
import { ScopedRuleRegistryClient, EventsOf } from './types';
import { BaseRuleFieldMap } from '../../../common';
import { RuleRegistry } from '..';

const createPathReporterError = (either: Either<Errors, unknown>) => {
  const error = new Error(`Failed to validate alert event`);
  error.stack += '\n' + PathReporter.report(either).join('\n');
  return error;
};

export function createScopedRuleRegistryClient<TFieldMap extends BaseRuleFieldMap>({
  ruleUuids,
  scopedClusterClient,
  clusterClientAdapter,
  indexAliasName,
  indexTarget,
  logger,
  registry,
  ruleData,
}: {
  ruleUuids: string[];
  scopedClusterClient: ScopedClusterClient;
  clusterClientAdapter: ClusterClientAdapter<{
    body: TypeOfFieldMap<TFieldMap>;
    index: string;
  }>;
  indexAliasName: string;
  indexTarget: string;
  logger: Logger;
  registry: RuleRegistry<TFieldMap>;
  ruleData?: {
    rule: {
      id: string;
      uuid: string;
      category: string;
      name: string;
    };
    producer: string;
    tags: string[];
  };
}): ScopedRuleRegistryClient<TFieldMap> {
  const fieldmapType = registry.getFieldMapType();

  const defaults = ruleData
    ? {
        'rule.uuid': ruleData.rule.uuid,
        'rule.id': ruleData.rule.id,
        'rule.name': ruleData.rule.name,
        'rule.category': ruleData.rule.category,
        'kibana.rac.producer': ruleData.producer,
        tags: ruleData.tags,
      }
    : {};

  const client: ScopedRuleRegistryClient<BaseRuleFieldMap> = {
    search: async (searchRequest) => {
      const fields = [
        'rule.id',
        ...(searchRequest.body?.fields ? castArray(searchRequest.body.fields) : []),
      ];

      const response = await scopedClusterClient.asInternalUser.search({
        ...searchRequest,
        index: indexTarget,
        body: {
          ...searchRequest.body,
          query: {
            bool: {
              filter: [
                { terms: { 'rule.uuid': ruleUuids } },
                ...compact([searchRequest.body?.query]),
              ],
            },
          },
          fields,
        },
      });

      return {
        body: response.body as any,
        events: compact(
          response.body.hits.hits.map((hit) => {
            const ruleTypeId: string = hit.fields!['rule.id'][0];

            const registryOfType = registry.getRegistryByRuleTypeId(ruleTypeId);

            if (ruleTypeId && !registryOfType) {
              logger.warn(
                `Could not find type ${ruleTypeId} in registry, decoding with default type`
              );
            }

            const type = registryOfType?.getFieldMapType() ?? fieldmapType;

            const validation = type.decode(hit.fields);
            if (isLeft(validation)) {
              const error = createPathReporterError(validation);
              logger.error(error);
              return undefined;
            }
            return type.encode(validation.right);
          })
        ) as EventsOf<ESSearchRequest, TFieldMap>,
      };
    },
    getDynamicIndexPattern: async () => {
      const indexPatternsFetcher = new IndexPatternsFetcher(scopedClusterClient.asInternalUser);

      const fields = await indexPatternsFetcher.getFieldsForWildcard({
        pattern: indexTarget,
      });

      return {
        fields,
        timeFieldName: '@timestamp',
        title: indexTarget,
      };
    },
    index: (doc) => {
      const validation = fieldmapType.decode({
        ...doc,
        ...defaults,
      });

      if (isLeft(validation)) {
        throw createPathReporterError(validation);
      }

      clusterClientAdapter.indexDocument({
        body: validation.right,
        index: indexAliasName,
      });
    },
    bulkIndex: (docs) => {
      const validations = docs.map((doc) => {
        return fieldmapType.decode({
          ...doc,
          ...defaults,
        });
      });

      const errors = compact(
        validations.map((validation) =>
          isLeft(validation) ? createPathReporterError(validation) : null
        )
      );

      errors.forEach((error) => {
        logger.error(error);
      });

      const operations = compact(
        validations.map((validation) => (isRight(validation) ? validation.right : null))
      ).map((doc) => ({ body: doc, index: indexAliasName }));

      return clusterClientAdapter.indexDocuments(operations);
    },
  };

  // @ts-expect-error: We can't use ScopedRuleRegistryClient<BaseRuleFieldMap>
  // when creating the client, due to #41693 which will be fixed in 4.2
  return client;
}
