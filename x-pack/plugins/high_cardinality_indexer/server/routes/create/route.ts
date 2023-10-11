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

const createRoute = createHighCardinalityIndexerServerRoute({
  endpoint: 'POST /internal/high_cardinality_indexer/_create',
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
    queueRegistry,
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

      logger.info(`1. installTemplate`);
      await installTemplate({ client, config, logger });
      logger.info(`2. installIndexTemplate`);
      await installIndexTemplate({ client, config, logger });
      logger.info(`3. installDatasetAssets`);
      await installDatasetAssets({ config, logger, soClient });
      logger.info(`4. indexSchedule`);
      await indexSchedule({ client, config, logger, queueRegistry });
      logger.info(`Success!`);
      return { success: true };
    } catch (error) {
      throw new Error(`Something went wrong while indexing: ${error}`);
    }
  },
});

export const createRoutes = {
  ...createRoute,
};
