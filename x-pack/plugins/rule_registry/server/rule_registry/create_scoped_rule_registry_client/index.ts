/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Either, isLeft, isRight } from 'fp-ts/lib/Either';
import { Errors } from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { Logger, SavedObjectsClientContract } from 'kibana/server';
import { IScopedClusterClient as ScopedClusterClient } from 'src/core/server';
import { compact } from 'lodash';
import { ESSearchRequest } from 'typings/elasticsearch';
import { ClusterClientAdapter } from '../../../../event_log/server';
import { runtimeTypeFromFieldMap, OutputOfFieldMap } from '../field_map/runtime_type_from_fieldmap';
import { ScopedRuleRegistryClient, EventsOf } from './types';
import { DefaultFieldMap } from '../defaults/field_map';

const getRuleUuids = async ({
  savedObjectsClient,
  namespace,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  namespace?: string;
}) => {
  const options = {
    type: 'alert',
    ...(namespace ? { namespace } : {}),
  };

  const pitFinder = savedObjectsClient.createPointInTimeFinder(options);

  const ruleUuids: string[] = [];

  for await (const response of pitFinder.find()) {
    ruleUuids.push(...response.saved_objects.map((object) => object.id));
  }

  await pitFinder.close();

  return ruleUuids;
};

const createPathReporterError = (either: Either<Errors, unknown>) => {
  const error = new Error(`Failed to validate alert event`);
  error.stack += '\n' + PathReporter.report(either).join('\n');
  return error;
};

export function createScopedRuleRegistryClient<TFieldMap extends DefaultFieldMap>({
  fieldMap,
  scopedClusterClient,
  savedObjectsClient,
  namespace,
  clusterClientAdapter,
  index,
  logger,
  ruleData,
}: {
  fieldMap: TFieldMap;
  scopedClusterClient: ScopedClusterClient;
  savedObjectsClient: SavedObjectsClientContract;
  namespace?: string;
  clusterClientAdapter: ClusterClientAdapter<{
    body: OutputOfFieldMap<TFieldMap>;
    index: string;
  }>;
  index: string;
  logger: Logger;
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
  const docRt = runtimeTypeFromFieldMap(fieldMap);

  const defaults: Partial<OutputOfFieldMap<DefaultFieldMap>> = ruleData
    ? {
        'rule.uuid': ruleData.rule.uuid,
        'rule.id': ruleData.rule.id,
        'rule.name': ruleData.rule.name,
        'rule.category': ruleData.rule.category,
        'kibana.rac.producer': ruleData.producer,
        tags: ruleData.tags,
      }
    : {};

  const client: ScopedRuleRegistryClient<TFieldMap> = {
    search: async (searchRequest) => {
      const ruleUuids = await getRuleUuids({
        savedObjectsClient,
        namespace,
      });

      const response = await scopedClusterClient.asInternalUser.search({
        ...searchRequest,
        index,
        body: {
          ...searchRequest.body,
          query: {
            bool: {
              filter: [
                { terms: { 'rule.uuid': ruleUuids } },
                ...(searchRequest.body?.query ? [searchRequest.body.query] : []),
              ],
            },
          },
        },
      });

      return {
        body: response.body as any,
        events: compact(
          response.body.hits.hits.map((hit) => {
            const validation = docRt.decode(hit.fields);
            if (isLeft(validation)) {
              const error = createPathReporterError(validation);
              logger.error(error);
              return undefined;
            }
            return docRt.encode(validation.right);
          })
        ) as EventsOf<ESSearchRequest, TFieldMap>,
      };
    },
    index: (doc) => {
      const validation = docRt.decode({
        ...doc,
        ...defaults,
      });

      if (isLeft(validation)) {
        throw createPathReporterError(validation);
      }

      clusterClientAdapter.indexDocument({ body: validation.right, index });
    },
    bulkIndex: (docs) => {
      const validations = docs.map((doc) => {
        return docRt.decode({
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
      ).map((doc) => ({ body: doc, index }));

      return clusterClientAdapter.indexDocuments(operations);
    },
  };
  return client;
}
