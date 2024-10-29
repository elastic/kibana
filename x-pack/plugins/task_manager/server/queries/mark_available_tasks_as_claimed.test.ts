/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { shouldBeOneOf, mustBeAllOf } from './query_clauses';

import {
  updateFieldsAndMarkAsFailed,
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
  SortByRunAtAndRetryAt,
  EnabledTask,
  InactiveTasks,
  RecognizedTask,
  OneOfTaskTypes,
  tasksWithPartitions,
  claimSort,
} from './mark_available_tasks_as_claimed';

import { TaskStatus, TaskPriority, ConcreteTaskInstance } from '../task';

import { TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';

let clock: sinon.SinonFakeTimers;

describe('mark_available_tasks_as_claimed', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  test('generates query matching tasks to be claimed when polling for tasks', () => {
    const definitions = new TaskTypeDictionary(mockLogger());
    definitions.registerTaskDefinitions({
      sampleTask: {
        title: 'title',
        maxAttempts: 5,
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
      },
      otherTask: {
        title: 'title',
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
      },
    });
    const defaultMaxAttempts = 1;
    const taskManagerId = '3478fg6-82374f6-83467gf5-384g6f';
    const claimOwnershipUntil = '2019-02-12T21:01:22.479Z';
    const fieldUpdates = {
      ownerId: taskManagerId,
      retryAt: claimOwnershipUntil,
    };

    expect({
      query: mustBeAllOf(
        // Task must be enabled
        EnabledTask,
        // Either a task with idle status and runAt <= now or
        // status running or claiming with a retryAt <= now.
        shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt)
      ),
      script: updateFieldsAndMarkAsFailed({
        fieldUpdates,
        claimableTaskTypes: definitions.getAllTypes(),
        skippedTaskTypes: [],
        unusedTaskTypes: [],
        taskMaxAttempts: Array.from(definitions).reduce((accumulator, [type, { maxAttempts }]) => {
          return { ...accumulator, [type]: maxAttempts || defaultMaxAttempts };
        }, {}),
      }),
      sort: SortByRunAtAndRetryAt,
    }).toEqual({
      query: {
        bool: {
          must: [
            {
              bool: {
                must: [
                  {
                    term: {
                      'task.enabled': true,
                    },
                  },
                ],
              },
            },
            // Either a task with idle status and runAt <= now or
            // status running or claiming with a retryAt <= now.
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
              },
            },
          ],
        },
      },
      sort: {
        _script: {
          type: 'number',
          order: 'asc',
          script: {
            lang: 'painless',
            source: `
if (doc['task.retryAt'].size()!=0) {
  return doc['task.retryAt'].value.toInstant().toEpochMilli();
}
if (doc['task.runAt'].size()!=0) {
  return doc['task.runAt'].value.toInstant().toEpochMilli();
}
    `,
          },
        },
      },
      script: {
        source: `
    if (params.claimableTaskTypes.contains(ctx._source.task.taskType)) {
      if(ctx._source.task.retryAt != null && ZonedDateTime.parse(ctx._source.task.retryAt).toInstant().toEpochMilli() < params.now) {
    ctx._source.task.scheduledAt=ctx._source.task.retryAt;
  } else {
    ctx._source.task.scheduledAt=ctx._source.task.runAt;
  }
    ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
      .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
      .join(' ')}
    } else if (params.unusedTaskTypes.contains(ctx._source.task.taskType)) {
      ctx._source.task.status = "unrecognized";
    } else {
      ctx.op = "noop";
    }`,
        lang: 'painless',
        params: {
          now: 0,
          fieldUpdates: {
            ownerId: taskManagerId,
            retryAt: claimOwnershipUntil,
          },
          claimableTaskTypes: ['sampleTask', 'otherTask'],
          skippedTaskTypes: [],
          unusedTaskTypes: [],
          taskMaxAttempts: {
            sampleTask: 5,
            otherTask: 1,
          },
        },
      },
    });
  });

  test('generates InactiveTasks clause as expected', () => {
    expect(InactiveTasks).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "must_not": Array [
            Object {
              "bool": Object {
                "minimum_should_match": 1,
                "must": Object {
                  "range": Object {
                    "task.retryAt": Object {
                      "gt": "now",
                    },
                  },
                },
                "should": Array [
                  Object {
                    "term": Object {
                      "task.status": "running",
                    },
                  },
                  Object {
                    "term": Object {
                      "task.status": "claiming",
                    },
                  },
                ],
              },
            },
          ],
        },
      }
    `);
  });

  test('generates RecognizedTask clause as expected', () => {
    expect(RecognizedTask).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "must_not": Array [
            Object {
              "term": Object {
                "task.status": "unrecognized",
              },
            },
          ],
        },
      }
    `);
  });

  describe(`script`, () => {
    test('it marks the update as a noop if the type is skipped', async () => {
      const taskManagerId = '3478fg6-82374f6-83467gf5-384g6f';
      const claimOwnershipUntil = '2019-02-12T21:01:22.479Z';
      const fieldUpdates = {
        ownerId: taskManagerId,
        retryAt: claimOwnershipUntil,
      };

      expect(
        updateFieldsAndMarkAsFailed({
          fieldUpdates,
          claimableTaskTypes: ['foo', 'bar'],
          skippedTaskTypes: [],
          unusedTaskTypes: [],
          taskMaxAttempts: {
            foo: 5,
            bar: 2,
          },
        }).source
      ).toMatch(/ctx.op = "noop"/);
    });
  });

  test('generates OneOfTaskTypes clause as expected', () => {
    expect(OneOfTaskTypes('field-name', ['type-a', 'type-b'])).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "must": Array [
            Object {
              "terms": Object {
                "field-name": Array [
                  "type-a",
                  "type-b",
                ],
              },
            },
          ],
        },
      }
    `);
  });

  test('generates tasksWithPartitions clause as expected', () => {
    expect(tasksWithPartitions([1, 2, 3])).toMatchInlineSnapshot(`
      Object {
        "bool": Object {
          "filter": Array [
            Object {
              "bool": Object {
                "should": Array [
                  Object {
                    "terms": Object {
                      "task.partition": Array [
                        1,
                        2,
                        3,
                      ],
                    },
                  },
                  Object {
                    "bool": Object {
                      "must_not": Array [
                        Object {
                          "exists": Object {
                            "field": "task.partition",
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
      }
    `);
  });

  // Tests sorting 3 tasks with different priorities, runAt/retryAt values
  // running the sort over all permutations of them.
  describe('claimSort', () => {
    const definitions = new TaskTypeDictionary(mockLogger());
    definitions.registerTaskDefinitions({
      normalPriorityTask: {
        title: 'normal priority',
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
        priority: TaskPriority.Normal, // 50
      },
      noPriorityTask: {
        title: 'no priority',
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
        priority: undefined, // 50
      },
      lowPriorityTask: {
        title: 'low priority',
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
        priority: TaskPriority.Low, // 1
      },
    });

    // possible ordering of tasks before sort
    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];

    test('works correctly with same dates, different priorities', () => {
      const date = new Date();
      const baseTasks: ConcreteTaskInstance[] = [];

      // push in reverse order
      baseTasks.push(buildTaskInstance({ taskType: 'lowPriorityTask', runAt: date }));
      baseTasks.push(buildTaskInstance({ taskType: 'noPriorityTask', runAt: date }));
      baseTasks.push(buildTaskInstance({ taskType: 'normalPriorityTask', runAt: date }));

      for (const perm of permutations) {
        const tasks = [baseTasks[perm[0]], baseTasks[perm[1]], baseTasks[perm[2]]];
        const sorted = claimSort(definitions, tasks);
        // all we know is low should be last
        expect(sorted[2]).toBe(baseTasks[0]);
      }
    });

    test('works correctly with same priorities, different dates', () => {
      const baseDate = new Date('2024-07-29T00:00:00Z').valueOf();
      const baseTasks: ConcreteTaskInstance[] = [];

      // push in reverse order
      baseTasks.push(
        buildTaskInstance({ taskType: 'noPriorityTask', runAt: new Date(baseDate + 1000) })
      );
      baseTasks.push(buildTaskInstance({ taskType: 'noPriorityTask', runAt: new Date(baseDate) }));
      baseTasks.push(
        buildTaskInstance({ taskType: 'noPriorityTask', runAt: new Date(baseDate - 1000) })
      );

      for (const perm of permutations) {
        const tasks = [baseTasks[perm[0]], baseTasks[perm[1]], baseTasks[perm[2]]];
        const sorted = claimSort(definitions, tasks);
        expect(sorted[0]).toBe(baseTasks[2]);
        expect(sorted[1]).toBe(baseTasks[1]);
        expect(sorted[2]).toBe(baseTasks[0]);
      }
    });

    test('works correctly with mixed of runAt and retryAt values', () => {
      const baseDate = new Date('2024-07-29T00:00:00Z').valueOf();
      const baseTasks: ConcreteTaskInstance[] = [];

      // push in reverse order
      baseTasks.push(
        buildTaskInstance({ taskType: 'noPriorityTask', runAt: new Date(baseDate + 1000) })
      );
      baseTasks.push(
        buildTaskInstance({
          taskType: 'noPriorityTask',
          runAt: new Date(baseDate - 2000),
          retryAt: new Date(baseDate), // should use this value
        })
      );
      baseTasks.push(
        buildTaskInstance({ taskType: 'noPriorityTask', runAt: new Date(baseDate - 1000) })
      );

      for (const perm of permutations) {
        const tasks = [baseTasks[perm[0]], baseTasks[perm[1]], baseTasks[perm[2]]];
        const sorted = claimSort(definitions, tasks);
        expect(sorted[0]).toBe(baseTasks[2]);
        expect(sorted[1]).toBe(baseTasks[1]);
        expect(sorted[2]).toBe(baseTasks[0]);
      }
    });
  });
});

interface BuildTaskOpts {
  taskType: string;
  runAt: Date;
  retryAt?: Date;
}

let id = 1;

function buildTaskInstance(opts: BuildTaskOpts): ConcreteTaskInstance {
  const { taskType, runAt, retryAt } = opts;
  return {
    taskType,
    id: `${id++}`,
    runAt,
    retryAt: retryAt || null,
    scheduledAt: runAt,
    attempts: 0,
    status: TaskStatus.Idle,
    startedAt: null,
    state: {},
    params: {},
    ownerId: null,
  };
}
