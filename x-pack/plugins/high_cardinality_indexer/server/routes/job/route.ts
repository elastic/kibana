/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { createHighCardinalityIndexerServerRoute } from '../create_high_cardinality_indexer_server_route';
import { installTemplate } from '../../lib/install_template';
import { installIndexTemplate } from '../../lib/install_index_template';
import { installDatasetAssets } from '../../lib/install_assets';
import { indexSchedule } from '../../lib/index_schedule';
import { type Config, DatasetRT, ScheduleRT } from '../../types';

const createJobRoute = createHighCardinalityIndexerServerRoute({
  endpoint: 'POST /internal/high_cardinality_indexer/job/_create',
  options: {},
  params: t.type({
    body: t.type({
      concurrency: t.number,
      dataset: DatasetRT,
      eventsPerCycle: t.number,
      installAssets: t.boolean,
      interval: t.number,
      payloadSize: t.number,
      reduceWeekendTrafficBy: t.number,
      schedule: t.array(ScheduleRT),
    }),
  }),
  handler: async ({
    context,
    logger,
    jobRegistry,
    params: {
      body: {
        concurrency,
        dataset,
        eventsPerCycle,
        installAssets,
        interval,
        payloadSize,
        reduceWeekendTrafficBy,
        schedule = [],
      },
    },
  }): Promise<{ success: boolean }> => {
    const config: Config = {
      indexing: {
        concurrency,
        dataset,
        eventsPerCycle,
        interval,
        reduceWeekendTrafficBy,
        payloadSize,
      },
      installAssets,
      schedule,
    };

    try {
      const client = (await context.core).elasticsearch.client.asCurrentUser;
      const soClient = (await context.core).savedObjects.client;

      await installTemplate({ client, config, logger });

      await installIndexTemplate({ client, config, logger });

      await installDatasetAssets({ config, logger, soClient });

      await indexSchedule({ client, config, logger, jobRegistry });
      logger.info(`Success!`);
      return { success: true };
    } catch (error) {
      throw new Error(`Something went wrong while indexing: ${error}`);
    }
  },
});

const getJobStatusRoute = createHighCardinalityIndexerServerRoute({
  endpoint: 'GET /internal/high_cardinality_indexer/job/_status',
  options: {},
  handler: async ({ logger, jobRegistry }): Promise<{ isRunning: boolean }> => {
    logger.debug(`Getting job status...`);
    const isRunning = jobRegistry.getStatus();
    if (isRunning) {
      logger.info(`Job is running...`);
    }
    return { isRunning };
  },
});

const stopJobRoute = createHighCardinalityIndexerServerRoute({
  endpoint: 'GET /internal/high_cardinality_indexer/job/_stop',
  options: {},
  handler: async ({ logger, jobRegistry }): Promise<{ success: true }> => {
    logger.info(`Stopping...`);

    try {
      jobRegistry.stop();
      logger.info(`Stopped indexing.`);
      return { success: true };
    } catch (error) {
      throw error;
    }
  },
});

export const jobRoutes = {
  ...createJobRoute,
  ...getJobStatusRoute,
  ...stopJobRoute,
};
