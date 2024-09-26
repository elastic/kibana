/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger, IRouter } from '@kbn/core/server';
import type { ITelemetryReceiver } from '../receiver';
import type { ITelemetryEventsSender } from '../sender';
import { TaskMetricsService } from '../task_metrics';
import { createTelemetryIndicesMetadataTaskConfig } from '../tasks/indices.metadata';

// TODO: just to test the POC, remove
export const getTriggerIndicesMetadataTaskRoute = (
  router: IRouter,
  logger: Logger,
  receiver: ITelemetryReceiver,
  sender: ITelemetryEventsSender
) => {
  router.get(
    {
      path: '/internal/trigger-indices-metadata-task',
      validate: false,
    },
    async (_context, _request, response) => {
      const taskMetricsService = new TaskMetricsService(logger, sender);
      const task = createTelemetryIndicesMetadataTaskConfig();
      const timeStart = performance.now();
      let msgSuffix = '';
      if (global.gc) {
        global.gc();
      } else {
        msgSuffix = ' (Note: Garbage collection is not exposed. Start Node.js with --expose-gc.)';
      }
      const initialMemory = process.memoryUsage().heapUsed;
      const result = await task.runTask('id', logger, receiver, sender, taskMetricsService, {
        last: 'last',
        current: 'current',
      });
      const memoryUsed = process.memoryUsage().heapUsed - initialMemory;
      const elapsedTime = performance.now() - timeStart;

      return response.ok({
        body: {
          message: `Task processed ${result} datastreams. It took ${elapsedTime} ms to run and required ${memoryUsed} bytes ${msgSuffix}`,
        },
      });
    }
  );
};
