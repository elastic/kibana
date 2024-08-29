/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreSetup } from '@kbn/core/server';
import type { RunContext, IntervalSchedule } from '../task';
import type { TaskDefinitionRegistry } from '../task_type_dictionary';
import type { TaskScheduling } from '../task_scheduling';
import { TASK_MANAGER_INDEX } from '../constants';
import { MAX_PARTITIONS } from '../lib/task_partitioner';

const REBALANCE_TASK_PARTITIONS_TASK_TYPE = `rebalance_task_partitions`;
const TASK_ID = `task_manager:${REBALANCE_TASK_PARTITIONS_TASK_TYPE}`;
export const SCHEDULE_BUSY: IntervalSchedule = { interval: '10s' };
export const SCHEDULE_QUIET: IntervalSchedule = { interval: '10m' };
const TASK_REPARTITION_LIMIT = 100;

export function registerRebalanceTaskPartitionsTask({
  logger,
  registerTaskDefinitions,
  core,
}: {
  logger: Logger;
  registerTaskDefinitions: (taskDefinitions: TaskDefinitionRegistry) => void;
  core: CoreSetup;
}) {
  registerTaskDefinitions({
    [REBALANCE_TASK_PARTITIONS_TASK_TYPE]: {
      title: 'Rebalance task partitions',
      createTaskRunner: rebalanceTaskPartitionsRunner(logger, core),
    },
  });
}

export async function ensureScheduleForRebalanceTaskPartitionsTask(
  logger: Logger,
  taskScheduling: TaskScheduling
) {
  try {
    await taskScheduling.ensureScheduled({
      id: TASK_ID,
      taskType: REBALANCE_TASK_PARTITIONS_TASK_TYPE,
      state: {},
      params: {},
      schedule: SCHEDULE_BUSY,
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID}, received ${e.message}`);
  }
}

export function rebalanceTaskPartitionsRunner(logger: Logger, core: CoreSetup) {
  const getEsClient = () =>
    core.getStartServices().then(
      ([
        {
          elasticsearch: { client },
        },
      ]) => client.asInternalUser
    );
  return ({ taskInstance }: RunContext) => {
    return {
      async run() {
        const esClient = await getEsClient();

        const aggResult = await esClient.search({
          index: TASK_MANAGER_INDEX,
          size: 0,
          aggs: {
            task_count_by_partition: {
              terms: {
                size: MAX_PARTITIONS,
                field: 'task.partition',
              },
            },
            tasks_in_biggest_partition: {
              terms: {
                size: 1,
                field: 'task.partition',
              },
              aggs: {
                tasks: {
                  top_hits: {
                    size: TASK_REPARTITION_LIMIT,
                  },
                },
              },
            },
          },
        });
        // eslint-disable-next-line no-console
        console.log('TASK REPARTITIONING SEARCH RESULT', JSON.stringify(aggResult));

        let totalTaskCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const bucket of (aggResult.aggregations?.task_count_by_partition as any).buckets) {
          totalTaskCount += Number(bucket.doc_count);
        }
        if (totalTaskCount === 0) {
          return { state: {}, schedule: SCHEDULE_QUIET };
        }

        const partitionTaskCountThreshold = Math.ceil(totalTaskCount / MAX_PARTITIONS);
        const tasksToRebalanceFromHighestPartition =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (aggResult.aggregations?.task_count_by_partition as any).buckets[0].doc_count -
          partitionTaskCountThreshold;

        if (tasksToRebalanceFromHighestPartition <= 0) {
          return { state: {}, schedule: SCHEDULE_QUIET };
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasksInBiggestPartition: any = aggResult.aggregations?.tasks_in_biggest_partition;
        const tasksToRebalance = tasksInBiggestPartition.buckets[0].tasks.hits.hits.slice(
          0,
          tasksToRebalanceFromHighestPartition
        );

        const partitionsWithTasks: number[] = [];
        const taskCountByPartition: Array<{ partition: number; taskCount: number }> = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const bucket of (aggResult.aggregations?.task_count_by_partition as any).buckets) {
          partitionsWithTasks.push(Number(bucket.key));
          taskCountByPartition.push({ partition: Number(bucket.key), taskCount: bucket.doc_count });
        }

        // Set values for empty partitions
        for (let i = 0; i < MAX_PARTITIONS; i++) {
          if (partitionsWithTasks.indexOf(i) === -1) {
            taskCountByPartition.push({ partition: i, taskCount: 0 });
          }
        }

        const sortedTaskCountByPartition = Array.from(taskCountByPartition).sort(
          (a, b) => a.taskCount - b.taskCount
        );

        let rebalanceTaskArrayPointer = 0;
        const taskIdMap: Record<string, number> = {};
        for (const item of sortedTaskCountByPartition) {
          if (item.taskCount < partitionTaskCountThreshold) {
            for (let i = 0; i < partitionTaskCountThreshold - item.taskCount; i++) {
              const taskId = tasksToRebalance[rebalanceTaskArrayPointer]._id;
              taskIdMap[taskId] = item.partition;
              logger.info(
                `Moving task ${taskId} from partition ${tasksToRebalance[rebalanceTaskArrayPointer]._source.task.partition} to ${item.partition}`
              );
              rebalanceTaskArrayPointer++;
              if (!tasksToRebalance[rebalanceTaskArrayPointer]) {
                break;
              }
            }
          }
          if (!tasksToRebalance[rebalanceTaskArrayPointer]) {
            break;
          }
        }

        const bulkBody = [];
        for (const taskId of Object.keys(taskIdMap)) {
          bulkBody.push({ update: { _id: taskId } });
          bulkBody.push({ doc: { task: { partition: taskIdMap[taskId] } } });
        }

        const bulkResult = await esClient.bulk({
          index: TASK_MANAGER_INDEX,
          body: bulkBody,
        });

        // eslint-disable-next-line no-console
        console.log('TASK REPARTITIONING BULK RESULT', JSON.stringify(bulkResult));

        return { state: {}, schedule: SCHEDULE_BUSY };
      },
    };
  };
}
