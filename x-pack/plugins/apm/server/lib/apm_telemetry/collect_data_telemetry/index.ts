/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge } from 'lodash';
import { Logger, LegacyCallAPIOptions } from 'kibana/server';
import { IndicesStatsParams, Client } from 'elasticsearch';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../typings/elasticsearch';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { tasks } from './tasks';
import { APMDataTelemetry } from '../types';

type TelemetryTaskExecutor = (params: {
  indices: ApmIndicesConfig;
  search<TSearchRequest extends ESSearchRequest>(
    params: TSearchRequest
  ): Promise<ESSearchResponse<unknown, TSearchRequest>>;
  indicesStats(
    params: IndicesStatsParams,
    options?: LegacyCallAPIOptions
  ): ReturnType<Client['indices']['stats']>;
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
