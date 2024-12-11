/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
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
      path: '/api/trigger-indices-metadata-task',
      options: {
        tags: ['api'],
        access: 'public',
        summary: 'Trigger indices metadata task (for testing purposes)',
      },
      validate: {
        query: schema.object({
          maxPrefixes: schema.maybe(schema.number()),
          maxGroupSize: schema.maybe(schema.number()),
        }),
      },
    },
    async (_context, request, response) => {
      const taskMetricsService = new TaskMetricsService(logger, sender);
      const task = createTelemetryIndicesMetadataTaskConfig();
      const timeStart = performance.now();

      const { maxPrefixes, maxGroupSize } = request.query;

      logger.info(
        `Triggering indices metadata task with pageSize: ${maxPrefixes} and dataStreamsLimit: ${maxGroupSize}`
      );

      const result = await task.runTask('id', logger, receiver, sender, taskMetricsService, {
        last: `${maxPrefixes || 10}`,
        current: `${maxGroupSize || 100}`,
      });
      const elapsedTime = performance.now() - timeStart;

      return response.ok({
        body: {
          message: `Task finished, it processed ${result} indices, took ${elapsedTime} ms to run `,
        },
      });
    }
  );
};
