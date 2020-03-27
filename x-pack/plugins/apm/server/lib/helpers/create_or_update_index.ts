/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import pRetry from 'p-retry';
import { IClusterClient, Logger } from 'src/core/server';
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';

export type Mappings =
  | {
      dynamic?: boolean | 'strict';
      properties: Record<string, Mappings>;
      dynamic_templates?: any[];
    }
  | {
      type: string;
      ignore_above?: number;
      scaling_factor?: number;
      ignore_malformed?: boolean;
      coerce?: boolean;
      fields?: Record<string, Mappings>;
    };

export async function createOrUpdateIndex({
  index,
  mappings,
  esClient,
  logger
}: {
  index: string;
  mappings: Mappings;
  esClient: IClusterClient;
  logger: Logger;
}) {
  try {
    /* Some times Kibana starts before ES is ready. When it happens an error is thrown while creating an index.
     * To make sure create index is called again when ES is ready, it keeps trying for more 10 times.
     * After that, an error is thrown and the index is not created.
     * More information here: https://github.com/elastic/kibana/issues/59420
     */
    await pRetry(async () => {
      const { callAsInternalUser } = esClient;
      const indexExists = await callAsInternalUser('indices.exists', { index });
      const result = indexExists
        ? await updateExistingIndex({
            index,
            callAsInternalUser,
            mappings
          })
        : await createNewIndex({
            index,
            callAsInternalUser,
            mappings
          });

      if (!result.acknowledged) {
        const resultError =
          result && result.error && JSON.stringify(result.error);
        throw new Error(resultError);
      }
    });
  } catch (e) {
    logger.error(
      `Could not create APM index: '${index}'. Error: ${e.message}.`
    );
  }
}

function createNewIndex({
  index,
  callAsInternalUser,
  mappings
}: {
  index: string;
  callAsInternalUser: CallCluster;
  mappings: Mappings;
}) {
  return callAsInternalUser('indices.create', {
    index,
    body: {
      // auto_expand_replicas: Allows cluster to not have replicas for this index
      settings: { 'index.auto_expand_replicas': '0-1' },
      mappings
    }
  });
}

function updateExistingIndex({
  index,
  callAsInternalUser,
  mappings
}: {
  index: string;
  callAsInternalUser: CallCluster;
  mappings: Mappings;
}) {
  return callAsInternalUser('indices.putMapping', {
    index,
    body: mappings
  });
}
