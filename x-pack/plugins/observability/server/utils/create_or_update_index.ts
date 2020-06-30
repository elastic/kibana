/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import pRetry from 'p-retry';
import { Logger, LegacyAPICaller } from 'src/core/server';

export interface MappingsObject {
  type: string;
  ignore_above?: number;
  scaling_factor?: number;
  ignore_malformed?: boolean;
  coerce?: boolean;
  fields?: Record<string, MappingsObject>;
}

export interface MappingsDefinition {
  dynamic?: boolean | 'strict';
  properties: Record<string, MappingsDefinition | MappingsObject>;
  dynamic_templates?: any[];
}

export async function createOrUpdateIndex({
  index,
  mappings,
  apiCaller,
  logger,
}: {
  index: string;
  mappings: MappingsDefinition;
  apiCaller: LegacyAPICaller;
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
    await pRetry(
      async () => {
        const indexExists = await apiCaller('indices.exists', { index });
        const result = indexExists
          ? await updateExistingIndex({
              index,
              apiCaller,
              mappings,
            })
          : await createNewIndex({
              index,
              apiCaller,
              mappings,
            });

        if (!result.acknowledged) {
          const resultError = result && result.error && JSON.stringify(result.error);
          throw new Error(resultError);
        }
      },
      {
        onFailedAttempt: (e) => {
          logger.warn(`Could not create index: '${index}'. Retrying...`);
          logger.warn(e);
        },
      }
    );
  } catch (e) {
    logger.error(`Could not create index: '${index}'. Error: ${e.message}.`);
  }
}

function createNewIndex({
  index,
  apiCaller,
  mappings,
}: {
  index: string;
  apiCaller: LegacyAPICaller;
  mappings: MappingsDefinition;
}) {
  return apiCaller('indices.create', {
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
  apiCaller,
  mappings,
}: {
  index: string;
  apiCaller: LegacyAPICaller;
  mappings: MappingsDefinition;
}) {
  return apiCaller('indices.putMapping', {
    index,
    body: mappings,
  });
}
