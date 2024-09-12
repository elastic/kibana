/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskStoreMock } from '../task_store.mock';
import { TaskManagerMetricsCollector } from './task_metrics_collector';

describe('TaskManagerMetricsCollector', () => {
  let clock: sinon.SinonFakeTimers;
  const mockTaskStore = taskStoreMock.create({});
  const logger = loggingSystemMock.create().get();

  beforeEach(() => {
    clock = sinon.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    jest.clearAllMocks();
    clock.restore();
  });

  test('intializes the metrics collector with the provided interval and emits events at each interval', async () => {
    mockTaskStore.aggregate.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 4, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        overallOverdueByHistogram: {
          buckets: [
            { key: 0, doc_count: 1 },
            { key: 10, doc_count: 1 },
            { key: 60, doc_count: 2 },
          ],
        },
        byTaskType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'taskType1',
              doc_count: 3,
              overdueByHistogram: {
                buckets: [
                  { key: 10, doc_count: 1 },
                  { key: 60, doc_count: 2 },
                ],
              },
            },
            {
              key: 'taskType2',
              doc_count: 1,
              overdueByHistogram: {
                buckets: [{ key: 0, doc_count: 1 }],
              },
            },
          ],
        },
      },
    });
    mockTaskStore.aggregate.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        overallOverdueByHistogram: {
          buckets: [],
        },
        byTaskType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [],
        },
      },
    });
    mockTaskStore.aggregate.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 1, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        overallOverdueByHistogram: {
          buckets: [{ key: 0, doc_count: 1 }],
        },
        byTaskType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'taskType3',
              doc_count: 1,
              overdueByHistogram: {
                buckets: [{ key: 0, doc_count: 1 }],
              },
            },
          ],
        },
      },
    });
    const pollInterval = 100;
    const halfInterval = Math.floor(pollInterval / 2);

    const taskManagerMetricsCollector = new TaskManagerMetricsCollector({
      logger,
      pollInterval,
      store: mockTaskStore,
      taskTypes: new Set(['taskType1', 'taskType2', 'taskType3', 'taskType4']),
      excludedTypes: new Set(['taskType4', 'taskType5']),
    });
    const handler = jest.fn();
    taskManagerMetricsCollector.events.subscribe(handler);

    expect(mockTaskStore.aggregate).toHaveBeenCalledTimes(1);
    expect(mockTaskStore.aggregate).toHaveBeenCalledWith({
      aggs: {
        overallOverdueByHistogram: {
          histogram: {
            field: 'overdueBySeconds',
            min_doc_count: 1,
            interval: 10,
          },
        },
        byTaskType: {
          terms: { field: 'task.taskType', size: 500 },
          aggs: {
            overdueByHistogram: {
              histogram: {
                field: 'overdueBySeconds',
                interval: 10,
              },
            },
          },
        },
      },
      runtime_mappings: {
        overdueBySeconds: {
          type: 'long',
          script: {
            source: `
                def taskStatus = doc['task.status'];
                def runAt = doc['task.runAt'];

                if (taskStatus.empty) {
                  emit(0);
                  return;
                }

                if(taskStatus == 'idle') {
                  emit((new Date().getTime() - runAt.value.getMillis()) / 1000);
                } else {
                  def retryAt = doc['task.retryAt'];
                  if(!retryAt.empty) {
                    emit((new Date().getTime() - retryAt.value.getMillis()) / 1000);
                  } else {
                    emit(0);
                  }
                }
              `,
          },
        },
      },
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { term: { 'task.status': 'idle' } },
                        { range: { 'task.runAt': { lte: 'now' } } },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        {
                          bool: {
                            should: [
                              { term: { 'task.status': 'running' } },
                              { term: { 'task.status': 'claiming' } },
                            ],
                          },
                        },
                        { range: { 'task.retryAt': { lte: 'now' } } },
                      ],
                    },
                  },
                ],
                minimum_should_match: 1,
                must: [
                  {
                    bool: {
                      must: [
                        {
                          terms: {
                            'task.taskType': ['taskType1', 'taskType2', 'taskType3'],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      size: 0,
    });

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(halfInterval);
    expect(mockTaskStore.aggregate).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      event: {
        tag: 'ok',
        value: {
          numOverdueTasks: {
            taskType1: [
              { key: 10, doc_count: 1 },
              { key: 60, doc_count: 2 },
            ],
            taskType2: [{ key: 0, doc_count: 1 }],
            total: [
              { key: 0, doc_count: 1 },
              { key: 10, doc_count: 1 },
              { key: 60, doc_count: 2 },
            ],
          },
        },
      },
      type: 'TASK_MANAGER_METRIC',
    });
    clock.tick(halfInterval);

    await new Promise((resolve) => setImmediate(resolve));
    expect(mockTaskStore.aggregate).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({
      event: {
        tag: 'ok',
        value: {
          numOverdueTasks: {
            total: [],
          },
        },
      },
      type: 'TASK_MANAGER_METRIC',
    });

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval + 10);
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockTaskStore.aggregate).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenCalledTimes(3);
    expect(handler).toHaveBeenCalledWith({
      event: {
        tag: 'ok',
        value: {
          numOverdueTasks: {
            taskType3: [{ key: 0, doc_count: 1 }],
            total: [{ key: 0, doc_count: 1 }],
          },
        },
      },
      type: 'TASK_MANAGER_METRIC',
    });
  });

  test('emits empty metric when querying for data fails and continues to query on interval', async () => {
    mockTaskStore.aggregate.mockImplementationOnce(async () => {
      throw new Error('failed to query');
    });
    mockTaskStore.aggregate.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 4, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        overallOverdueByHistogram: {
          buckets: [
            { key: 0, doc_count: 1 },
            { key: 10, doc_count: 1 },
            { key: 60, doc_count: 2 },
          ],
        },
        byTaskType: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [
            {
              key: 'taskType1',
              doc_count: 3,
              overdueByHistogram: {
                buckets: [
                  { key: 10, doc_count: 1 },
                  { key: 60, doc_count: 2 },
                ],
              },
            },
            {
              key: 'taskType2',
              doc_count: 1,
              overdueByHistogram: {
                buckets: [{ key: 0, doc_count: 1 }],
              },
            },
          ],
        },
      },
    });
    const pollInterval = 100;
    const halfInterval = Math.floor(pollInterval / 2);

    const taskTypes = new Set([]);
    const taskManagerMetricsCollector = new TaskManagerMetricsCollector({
      logger,
      pollInterval,
      store: mockTaskStore,
      taskTypes,
      excludedTypes: taskTypes,
    });
    const handler = jest.fn();
    taskManagerMetricsCollector.events.subscribe(handler);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(halfInterval);

    expect(mockTaskStore.aggregate).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledWith(
      `Error querying for task manager metrics - failed to query`
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      event: {
        tag: 'ok',
        value: {
          numOverdueTasks: {
            total: [],
          },
        },
      },
      type: 'TASK_MANAGER_METRIC',
    });

    clock.tick(halfInterval);

    await new Promise((resolve) => setImmediate(resolve));
    expect(mockTaskStore.aggregate).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith({
      event: {
        tag: 'ok',
        value: {
          numOverdueTasks: {
            taskType1: [
              { key: 10, doc_count: 1 },
              { key: 60, doc_count: 2 },
            ],
            taskType2: [{ key: 0, doc_count: 1 }],
            total: [
              { key: 0, doc_count: 1 },
              { key: 10, doc_count: 1 },
              { key: 60, doc_count: 2 },
            ],
          },
        },
      },
      type: 'TASK_MANAGER_METRIC',
    });
  });

  test('handles malformed result', async () => {
    mockTaskStore.aggregate.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 4, relation: 'eq' }, max_score: null, hits: [] },
      // no aggregation in result
    });
    const pollInterval = 100;
    const halfInterval = Math.floor(pollInterval / 2);

    const taskTypes = new Set([]);
    const taskManagerMetricsCollector = new TaskManagerMetricsCollector({
      logger,
      pollInterval,
      store: mockTaskStore,
      taskTypes,
      excludedTypes: taskTypes,
    });
    const handler = jest.fn();
    taskManagerMetricsCollector.events.subscribe(handler);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(halfInterval);

    expect(mockTaskStore.aggregate).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      event: {
        tag: 'ok',
        value: {
          numOverdueTasks: {
            total: [],
          },
        },
      },
      type: 'TASK_MANAGER_METRIC',
    });
  });
});
