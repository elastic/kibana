/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { config } from './config';

interface CreateIndicesOpts {
  esClient: ElasticsearchClient;
}

export async function createIndices({ esClient }: CreateIndicesOpts) {
  await esClient.indices.create({
    index: config.tasksIndex,
    body: {
      settings: {
        number_of_shards: config.numOfShards,
        number_of_replicas: config.numOfReplicas,
      },
      mappings: {
        properties: {
          interval: { type: 'integer' },
          params: { type: 'object', enabled: false },
        },
      },
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Created "${config.tasksIndex}" index`);

  await esClient.indices.create({
    index: config.taskScheduleIndex,
    body: {
      settings: {
        number_of_shards: config.numOfShards,
        number_of_replicas: config.numOfReplicas,
      },
      mappings: {
        properties: {
          taskId: { type: 'keyword' },
          runAt: { type: 'date' },
          state: { type: 'object', enabled: false },
          runningNodeId: { type: 'keyword' },
          partitionId: { type: 'integer' },
          lockedAt: { type: 'date' },
          join: {
            type: 'join',
            relations: {
              schedule: 'lock',
            },
          },
        },
      },
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Created "${config.taskScheduleIndex}" index`);
}
