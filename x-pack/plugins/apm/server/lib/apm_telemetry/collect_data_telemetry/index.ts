/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { Logger, SavedObjectsClient } from '@kbn/core/server';
import { ApmIndicesConfig } from '../../../routes/settings/apm_indices/get_apm_indices';
import { tasks } from './tasks';
import { APMDataTelemetry } from '../types';
import { TelemetryClient } from '../telemetry_client';

type ISavedObjectsClient = Pick<SavedObjectsClient, 'find'>;

export interface TelemetryTaskExecutorParams {
  telemetryClient: TelemetryClient;
  indices: ApmIndicesConfig;
  savedObjectsClient: ISavedObjectsClient;
}

type TelemetryTaskExecutor = (
  params: TelemetryTaskExecutorParams
) => Promise<APMDataTelemetry>;

export interface TelemetryTask {
  name: string;
  executor: TelemetryTaskExecutor;
}

export type CollectTelemetryParams = TelemetryTaskExecutorParams & {
  isProd: boolean;
  logger: Logger;
};

export function collectDataTelemetry({
  indices,
  logger,
  telemetryClient,
  savedObjectsClient,
  isProd,
}: CollectTelemetryParams) {
  return tasks.reduce((prev, task) => {
    return prev.then(async (data) => {
      logger.debug(`Executing APM telemetry task ${task.name}`);
      try {
        const time = process.hrtime();
        const next = await task.executor({
          telemetryClient,
          indices,
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
