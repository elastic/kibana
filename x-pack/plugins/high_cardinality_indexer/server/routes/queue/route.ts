/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueueObject } from 'async';
import { Doc } from '../../../common/types';
import { createHighCardinalityIndexerServerRoute } from '../create_high_cardinality_indexer_server_route';

const queueStatusRoute = createHighCardinalityIndexerServerRoute({
  endpoint: 'GET /internal/high_cardinality_indexer/queue/_status',
  options: {},
  handler: async ({ logger, queueRegistry }): Promise<Array<QueueObject<Doc>>> => {
    logger.info(`Getting queue status...`);
    return queueRegistry.getQueues();
  },
});

const stopQueuesRoute = createHighCardinalityIndexerServerRoute({
  endpoint: 'GET /internal/high_cardinality_indexer/queue/_stop',
  options: {},
  handler: async ({ logger, queueRegistry }): Promise<{ success: true }> => {
    logger.info(`Stopping all queues...`);

    try {
      queueRegistry.stopQueues();
      logger.info(`Stopped all queues.`);
      return { success: true };
    } catch (error) {
      throw error;
    }
  },
});

export const queueRoutes = {
  ...queueStatusRoute,
  ...stopQueuesRoute,
};
