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
  logger,
}: {
  index: string;
  mappings: Mappings;
  esClient: IClusterClient;
  logger: Logger;
}) {
  try {
    /*
     * In some cases we could be trying to create an index before ES is ready.
     * When this happens, we retry creating the index with exponential backoff.
     * We use retry's default formula, meaning that the first retry happens after 2s,
     * the 5th after 32s, and the final attempt after around 17m. If the final attempt fails,
     * the error is logged to the console.
     * See https://github.com/sindresorhus/p-retry and https://github.com/tim-kos/node-retry.
     */
    await pRetry(async () => {
      const { callAsInternalUser } = esClient;
      const indexExists = await callAsInternalUser('indices.exists', { index });
      const result = indexExists
        ? await updateExistingIndex({
            index,
            callAsInternalUser,
            mappings,
          })
        : await createNewIndex({
            index,
            callAsInternalUser,
            mappings,
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
  mappings,
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
      mappings,
    },
  });
}

function updateExistingIndex({
  index,
  callAsInternalUser,
  mappings,
}: {
  index: string;
  callAsInternalUser: CallCluster;
  mappings: Mappings;
}) {
  return callAsInternalUser('indices.putMapping', {
    index,
    body: mappings,
  });
}
