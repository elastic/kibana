/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { Logger, SavedObjectsClient } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { ApmIndicesConfig } from '../../../routes/settings/apm_indices/get_apm_indices';
import { tasks } from './tasks';
import { APMDataTelemetry } from '../types';

type ISavedObjectsClient = Pick<SavedObjectsClient, 'find'>;

type TelemetryTaskExecutor = (params: {
  indices: ApmIndicesConfig;
  search<TSearchRequest extends ESSearchRequest>(
    params: TSearchRequest
  ): Promise<ESSearchResponse<unknown, TSearchRequest>>;
  indicesStats(
    params: estypes.IndicesStatsRequest
    // promise returned by client has an abort property
    // so we cannot use its ReturnType
  ): Promise<{
    _all?: {
      total?: { store?: { size_in_bytes?: number }; docs?: { count?: number } };
    };
    _shards?: {
      total?: number;
    };
  }>;
  transportRequest: (params: {
    path: string;
    method: 'get';
  }) => Promise<unknown>;
  savedObjectsClient: ISavedObjectsClient;
}) => Promise<APMDataTelemetry>;

export interface TelemetryTask {
  name: string;
  executor: TelemetryTaskExecutor;
}

export type CollectTelemetryParams = Parameters<TelemetryTaskExecutor>[0] & {
  isProd: boolean;
  logger: Logger;
};

export function collectDataTelemetry({
  search,
  indices,
  logger,
  indicesStats,
  transportRequest,
  savedObjectsClient,
  isProd,
}: CollectTelemetryParams) {
  return tasks.reduce((prev, task) => {
    return prev.then(async (data) => {
      logger.debug(`Executing APM telemetry task ${task.name}`);
      try {
        const time = process.hrtime();
        const next = await task.executor({
          search,
          indices,
          indicesStats,
          transportRequest,
          savedObjectsClient,
        });
        const took = process.hrtime(time);

        return merge({}, data, next, {
          tasks: {
            [task.name]: {
              took: {
                ms: Math.round(took[0] * 1000 + took[1] / 1e6),
              },
            },
          },
        });
      } catch (err) {
        // catch error and log as debug in production env and warn in dev env
        const logLevel = isProd ? logger.debug : logger.warn;
        logLevel(`Failed executing the APM telemetry task: "${task.name}"`);
        logLevel(err);
        return data;
      }
    });
  }, Promise.resolve({} as APMDataTelemetry));
}
