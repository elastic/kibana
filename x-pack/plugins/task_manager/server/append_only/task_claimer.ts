/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { TaskPartitioner } from '../lib/task_partitioner';
import { config } from './config';
import { createIndices } from './create_indices';

interface TaskClaimerOpts {
  kibanaUuid: string;
  esClient: ElasticsearchClient;
  taskPartitioner: TaskPartitioner;
}

export async function start(opts: TaskClaimerOpts) {
  // eslint-disable-next-line no-console
  console.log('kibanaUuid', opts.kibanaUuid);
  try {
    await createIndices({ esClient: opts.esClient });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('*** Failed to create indices:', e);
  }

  setInterval(async () => {
    try {
      await run(opts);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Failed task claiming cycle:', e);
    }
  }, config.claimInterval);
}

async function run(opts: TaskClaimerOpts) {
  const partitions = await opts.taskPartitioner.getPartitions();

  if (partitions.length === 0) {
    // eslint-disable-next-line no-console
    console.log('*** Skipping claim cycle as no paritions found');
  }

  const tasksToClaim = (
    await opts.esClient.search({
      index: config.taskScheduleIndex,
      body: {
        query: {
          bool: {
            must: [
              {
                term: {
                  join: 'schedule',
                },
              },
              {
                range: {
                  runAt: {
                    lte: Date.now(),
                  },
                },
              },
              {
                terms: {
                  partitionId: partitions,
                },
              },
            ],
            must_not: [
              {
                has_child: {
                  type: 'lock',
                  query: {
                    match_all: {},
                  },
                },
              },
              {
                range: {
                  lockedAt: {
                    lte: config.lockTimeout,
                  },
                },
              },
            ],
          },
        },
        size: config.workerConcurrency * config.claimPageMultiplier,
        sort: {
          runAt: { order: 'asc' },
        },
      },
    })
  ).hits.hits;

  if (tasksToClaim.length === 0) {
    return;
  }

  const filteredTasks = await (async () => {
    const mget = await opts.esClient.mget({
      index: config.taskScheduleIndex,
      body: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ids: tasksToClaim.map((t) => `${t._id}:${(t as any)._source.runAt}`),
      },
    });
    const map: Record<string, boolean> = {};
    for (const mgetHit of mget.docs) {
      const id = mgetHit._id as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map[id] = (mgetHit as any).found;
    }

    return tasksToClaim.filter((t) => !map[t._id]);
  })();

  if (filteredTasks.length === 0) {
    return;
  }

  const params = [];
  for (const row of filteredTasks.slice(0, config.workerConcurrency)) {
    params.push({
      create: {
        _index: config.taskScheduleIndex,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _id: `${row._id}:${(row as any)._source.runAt}`,
        routing: row._id,
      },
    });
    params.push({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      taskId: (row as any)._source.taskId,
      taskScheduleId: row._id,
      runningNodeId: opts.kibanaUuid,
      join: { name: 'lock', parent: row._id },
      lockedAt: new Date(),
    });
  }
  if (params.length > 0) {
    const result2 = await opts.esClient.bulk({
      index: config.taskScheduleIndex,
      body: params,
      refresh: true,
    });
    for (const row of filteredTasks) {
      const bulkResultForTask = result2.items.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => i.create._id === `${row._id}:${(row as any)._source.runAt}`
      );
      if (bulkResultForTask?.create?.status === 201) {
        await runTask(row);
        await scheduleNextRun(row, opts);
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runTask(task: any) {
  // eslint-disable-next-line no-console
  console.log(new Date(), 'Running append-only task:', task._id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function scheduleNextRun(task: any, opts: TaskClaimerOpts) {
  await opts.esClient.index({
    index: config.taskScheduleIndex,
    body: {
      taskId: task._id,
      // TODO: Pull from task index
      runAt: new Date(Date.now() + 60000),
      state: {},
      join: { name: 'schedule' },
      partitionId: Math.floor(Math.random() * 360),
    },
  });
}
