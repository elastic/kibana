/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { Logger } from '@kbn/core/server';
import { tasks, TelemetryTaskExecutorParams } from './tasks';
import { APMDataTelemetry } from '../types';

type CollectTelemetryParams = TelemetryTaskExecutorParams & {
  isProd: boolean;
  logger: Logger;
};

export function collectDataTelemetry({
  indices,
  telemetryClient,
  savedObjectsClient,
  isProd,
  logger,
}: CollectTelemetryParams) {
  return tasks.reduce((prev, task) => {
    return prev.then(async (data) => {
      logger.debug(`Executing APM telemetry task ${task.name}`);
      try {
        const time = process.hrtime();
        const next = await task.executor({
          indices,
          telemetryClient,
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
