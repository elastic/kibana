/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { Logger } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '@kbn/core/types/elasticsearch';
import { ApmIndicesConfig } from '../../../routes/settings/apm_indices/get_apm_indices';
import { tasks } from './tasks';
import { APMDataTelemetry } from '../types';

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
}) => Promise<APMDataTelemetry>;

export interface TelemetryTask {
  name: string;
  executor: TelemetryTaskExecutor;
}

export type CollectTelemetryParams = Parameters<TelemetryTaskExecutor>[0] & {
  logger: Logger;
};

export function collectDataTelemetry({
  search,
  indices,
  logger,
  indicesStats,
  transportRequest,
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
        logger.warn(`Failed executing APM telemetry task ${task.name}`);
        logger.warn(err);
        return data;
      }
    });
  }, Promise.resolve({} as APMDataTelemetry));
}
