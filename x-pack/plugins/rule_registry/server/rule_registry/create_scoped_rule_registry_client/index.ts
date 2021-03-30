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
import { ClusterClientAdapter } from '../../../../event_log/server';
import { runtimeTypeFromFieldMap, OutputOfFieldMap } from '../field_map/runtime_type_from_fieldmap';
import { ScopedRuleRegistryClient } from './types';
import { DefaultFieldMap } from '../defaults/field_map';

const getRuleIds = async ({
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

  const ruleIds: string[] = [];

  for await (const response of pitFinder.find()) {
    ruleIds.push(...response.saved_objects.map((object) => object.id));
  }

  await pitFinder.close();

  return ruleIds;
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
  rule,
  producer,
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
  rule: {
    id: string;
    uuid: string;
    category: string;
    name: string;
  };
  producer: string;
}): Promise<ScopedRuleRegistryClient<TFieldMap>> {
  const docRt = runtimeTypeFromFieldMap(fieldMap);

  const defaults = {
    'rule.uuid': rule.uuid,
    'rule.id': rule.id,
    'rule.name': rule.name,
    'rule.category': rule.category,
    producer,
  };

  const createClient = async () => {
    const ruleIds = await getRuleIds({
      savedObjectsClient,
      namespace,
    });

    const client: ScopedRuleRegistryClient<TFieldMap> = {
      search: async (searchRequest) => {
        const response = await scopedClusterClient.asInternalUser.search({
          index,
          body: {
            query: {
              bool: {
                filter: [
                  { terms: { 'rule.uuid': ruleIds } },
                  ...(searchRequest.body?.query ? [searchRequest.body.query] : []),
                ],
              },
            },
          },
        });

        return response.body as any;
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
          return docRt.decode(doc);
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
  };

  return createClient();
}
