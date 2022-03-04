/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import uuid from 'uuid';
import { filter, take, toArray } from 'rxjs/operators';
import { some, none } from 'fp-ts/lib/Option';

import { TaskStatus, ConcreteTaskInstance } from '../task';
import { SearchOpts, StoreOpts, UpdateByQueryOpts, UpdateByQuerySearchOpts } from '../task_store';
import { asTaskClaimEvent, ClaimTaskErr, TaskClaimErrorType, TaskEvent } from '../task_events';
import { asOk, asErr } from '../lib/result_type';
import { TaskTypeDictionary } from '../task_type_dictionary';
import type { MustNotCondition } from '../queries/query_clauses';
import { mockLogger } from '../test_utils';
import {
  TaskClaiming,
  OwnershipClaimingOpts,
  TaskClaimingOpts,
  TASK_MANAGER_MARK_AS_CLAIMED,
} from './task_claiming';
import { Observable } from 'rxjs';
import { taskStoreMock } from '../task_store.mock';
import apm from 'elastic-apm-node';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';

const taskManagerLogger = mockLogger();

beforeEach(() => jest.clearAllMocks());

const mockedDate = new Date('2019-02-12T21:01:22.479Z');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Date = class Date {
  constructor() {
    return mockedDate;
  }
  static now() {
    return mockedDate.getTime();
  }
};

const taskDefinitions = new TaskTypeDictionary(taskManagerLogger);
taskDefinitions.registerTaskDefinitions({
  report: {
    title: 'report',
    createTaskRunner: jest.fn(),
  },
  dernstraight: {
    title: 'dernstraight',
    createTaskRunner: jest.fn(),
  },
  yawn: {
    title: 'yawn',
    createTaskRunner: jest.fn(),
  },
});

const mockApmTrans = {
  end: jest.fn(),
};

describe('TaskClaiming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(apm, 'startTransaction')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => mockApmTrans as any);
  });

  test(`should log when a certain task type is skipped due to having a zero concurency configuration`, () => {
    const definitions = new TaskTypeDictionary(mockLogger());
    definitions.registerTaskDefinitions({
      unlimited: {
        title: 'unlimited',
        createTaskRunner: jest.fn(),
      },
      anotherUnlimited: {
        title: 'anotherUnlimited',
        createTaskRunner: jest.fn(),
      },
      limitedToZero: {
        title: 'limitedToZero',
        maxConcurrency: 0,
        createTaskRunner: jest.fn(),
      },
      limitedToOne: {
        title: 'limitedToOne',
        maxConcurrency: 1,
        createTaskRunner: jest.fn(),
      },
      anotherLimitedToZero: {
        title: 'anotherLimitedToZero',
        maxConcurrency: 0,
        createTaskRunner: jest.fn(),
      },
      limitedToTwo: {
        title: 'limitedToTwo',
        maxConcurrency: 2,
        createTaskRunner: jest.fn(),
      },
    });

    new TaskClaiming({
      logger: taskManagerLogger,
      definitions,
      excludedTaskTypes: [],
      unusedTypes: [],
      taskStore: taskStoreMock.create({ taskManagerId: '' }),
      maxAttempts: 2,
      getCapacity: () => 10,
    });

    expect(taskManagerLogger.info).toHaveBeenCalledTimes(1);
    expect(taskManagerLogger.info.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Task Manager will never claim tasks of the following types as their \\"maxConcurrency\\" is set to 0: limitedToZero, anotherLimitedToZero"`
    );
  });

  describe('claimAvailableTasks', () => {
    function initialiseTestClaiming({
      storeOpts = {},
      taskClaimingOpts = {},
      hits = [generateFakeTasks(1)],
      versionConflicts = 2,
      excludedTaskTypes = [],
      unusedTaskTypes = [],
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      hits?: ConcreteTaskInstance[][];
      versionConflicts?: number;
      excludedTaskTypes?: string[];
      unusedTaskTypes?: string[];
    }) {
      const definitions = storeOpts.definitions ?? taskDefinitions;
      const store = taskStoreMock.create({ taskManagerId: storeOpts.taskManagerId });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      if (hits.length === 1) {
        store.fetch.mockResolvedValue({ docs: hits[0] });
        store.updateByQuery.mockResolvedValue({
          updated: hits[0].length,
          version_conflicts: versionConflicts,
          total: hits[0].length,
        });
      } else {
        for (const docs of hits) {
          store.fetch.mockResolvedValueOnce({ docs });
          store.updateByQuery.mockResolvedValueOnce({
            updated: docs.length,
            version_conflicts: versionConflicts,
            total: docs.length,
          });
        }
      }

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        definitions,
        taskStore: store,
        excludedTaskTypes,
        unusedTypes: unusedTaskTypes,
        maxAttempts: taskClaimingOpts.maxAttempts ?? 2,
        getCapacity: taskClaimingOpts.getCapacity ?? (() => 10),
        ...taskClaimingOpts,
      });

      return { taskClaiming, store };
    }

    async function testClaimAvailableTasks({
      storeOpts = {},
      taskClaimingOpts = {},
      claimingOpts,
      hits = [generateFakeTasks(1)],
      versionConflicts = 2,
      excludedTaskTypes = [],
      unusedTaskTypes = [],
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      claimingOpts: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>;
      hits?: ConcreteTaskInstance[][];
      versionConflicts?: number;
      excludedTaskTypes?: string[];
      unusedTaskTypes?: string[];
    }) {
      const getCapacity = taskClaimingOpts.getCapacity ?? (() => 10);
      const { taskClaiming, store } = initialiseTestClaiming({
        storeOpts,
        taskClaimingOpts,
        excludedTaskTypes,
        unusedTaskTypes,
        hits,
        versionConflicts,
      });

      const results = await getAllAsPromise(taskClaiming.claimAvailableTasks(claimingOpts));

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('success');

      expect(store.updateByQuery.mock.calls[0][1]).toMatchObject({
        max_docs: getCapacity(),
      });
      expect(store.fetch.mock.calls[0][0]).toMatchObject({ size: getCapacity() });
      return results.map((result, index) => ({
        result,
        args: {
          search: store.fetch.mock.calls[index][0] as SearchOpts & {
            query: MustNotCondition;
          },
          updateByQuery: store.updateByQuery.mock.calls[index] as [
            UpdateByQuerySearchOpts,
            UpdateByQueryOpts
          ],
        },
      }));
    }

    test('makes calls to APM as expected when markAvailableTasksAsClaimed throws error', async () => {
      const maxAttempts = _.random(2, 43);
      const customMaxAttempts = _.random(44, 100);

      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
      });

      const { taskClaiming, store } = initialiseTestClaiming({
        storeOpts: {
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
        },
      });

      store.updateByQuery.mockRejectedValue(new Error('Oh no'));

      await expect(
        getAllAsPromise(
          taskClaiming.claimAvailableTasks({
            claimOwnershipUntil: new Date(),
          })
        )
      ).rejects.toMatchInlineSnapshot(`[Error: Oh no]`);

      expect(apm.startTransaction).toHaveBeenCalledWith(
        TASK_MANAGER_MARK_AS_CLAIMED,
        TASK_MANAGER_TRANSACTION_TYPE
      );
      expect(mockApmTrans.end).toHaveBeenCalledWith('failure');
    });

    test('it filters claimed tasks down by supported types, maxAttempts, status, and runAt', async () => {
      const maxAttempts = _.random(2, 43);
      const customMaxAttempts = _.random(44, 100);

      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
        foobar: {
          title: 'foobar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
      });

      const [
        {
          args: {
            updateByQuery: [{ query, sort }],
          },
        },
      ] = await testClaimAvailableTasks({
        storeOpts: {
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
        },
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
        excludedTaskTypes: ['foobar'],
      });
      expect(query).toMatchObject({
        bool: {
          must: [
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
          filter: [
            {
              bool: {
                must_not: [
                  {
                    bool: {
                      should: [
                        { term: { 'task.status': 'running' } },
                        { term: { 'task.status': 'claiming' } },
                      ],
                      must: { range: { 'task.retryAt': { gt: 'now' } } },
                    },
                  },
                ],
              },
            },
          ],
        },
      });
      expect(sort).toMatchObject([
        {
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
      ]);
    });

    test('it supports claiming specific tasks by id', async () => {
      const maxAttempts = _.random(2, 43);
      const customMaxAttempts = _.random(44, 100);
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskManagerId = uuid.v1();
      const fieldUpdates = {
        ownerId: taskManagerId,
        retryAt: new Date(Date.now()),
      };
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
      });
      const [
        {
          args: {
            updateByQuery: [{ query, script, sort }],
          },
        },
      ] = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
        },
        claimingOpts: {
          claimOwnershipUntil: new Date(),
          claimTasksById: [
            '33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
            'a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
          ],
        },
      });

      expect(query).toMatchObject({
        bool: {
          must: [
            {
              pinned: {
                ids: [
                  'task:33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
                  'task:a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
                ],
                organic: {
                  bool: {
                    must: [
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
              },
            },
          ],
          filter: [
            {
              bool: {
                must_not: [
                  {
                    bool: {
                      should: [
                        { term: { 'task.status': 'running' } },
                        { term: { 'task.status': 'claiming' } },
                      ],
                      must: { range: { 'task.retryAt': { gt: 'now' } } },
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      expect(script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [
            'task:33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
            'task:a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
          ],
          claimableTaskTypes: ['foo', 'bar'],
          skippedTaskTypes: [],
          unusedTaskTypes: [],
          taskMaxAttempts: {
            bar: customMaxAttempts,
            foo: maxAttempts,
          },
        },
      });

      expect(sort).toMatchObject([
        '_score',
        {
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
      ]);
    });

    test('it should claim in batches partitioned by maxConcurrency', async () => {
      const maxAttempts = _.random(2, 43);
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskManagerId = uuid.v1();
      const fieldUpdates = {
        ownerId: taskManagerId,
        retryAt: new Date(Date.now()),
      };
      definitions.registerTaskDefinitions({
        unlimited: {
          title: 'unlimited',
          createTaskRunner: jest.fn(),
        },
        limitedToZero: {
          title: 'limitedToZero',
          maxConcurrency: 0,
          createTaskRunner: jest.fn(),
        },
        anotherUnlimited: {
          title: 'anotherUnlimited',
          createTaskRunner: jest.fn(),
        },
        finalUnlimited: {
          title: 'finalUnlimited',
          createTaskRunner: jest.fn(),
        },
        limitedToOne: {
          title: 'limitedToOne',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
        anotherLimitedToOne: {
          title: 'anotherLimitedToOne',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
        limitedToTwo: {
          title: 'limitedToTwo',
          maxConcurrency: 2,
          createTaskRunner: jest.fn(),
        },
      });
      const results = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
          getCapacity: (type) => {
            switch (type) {
              case 'limitedToOne':
              case 'anotherLimitedToOne':
                return 1;
              case 'limitedToTwo':
                return 2;
              default:
                return 10;
            }
          },
        },
        claimingOpts: {
          claimOwnershipUntil: new Date(),
          claimTasksById: [
            '33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
            'a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
          ],
        },
      });

      expect(results.length).toEqual(4);

      expect(results[0].args.updateByQuery[1].max_docs).toEqual(10);
      expect(results[0].args.updateByQuery[0].script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [
            'task:33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
            'task:a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
          ],
          claimableTaskTypes: ['unlimited', 'anotherUnlimited', 'finalUnlimited'],
          skippedTaskTypes: [
            'limitedToZero',
            'limitedToOne',
            'anotherLimitedToOne',
            'limitedToTwo',
          ],
          unusedTaskTypes: [],
          taskMaxAttempts: {
            unlimited: maxAttempts,
          },
        },
      });

      expect(results[1].args.updateByQuery[1].max_docs).toEqual(1);
      expect(results[1].args.updateByQuery[0].script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [],
          claimableTaskTypes: ['limitedToOne'],
          skippedTaskTypes: [
            'unlimited',
            'limitedToZero',
            'anotherUnlimited',
            'finalUnlimited',
            'anotherLimitedToOne',
            'limitedToTwo',
          ],
          taskMaxAttempts: {
            limitedToOne: maxAttempts,
          },
        },
      });

      expect(results[2].args.updateByQuery[1].max_docs).toEqual(1);
      expect(results[2].args.updateByQuery[0].script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [],
          claimableTaskTypes: ['anotherLimitedToOne'],
          skippedTaskTypes: [
            'unlimited',
            'limitedToZero',
            'anotherUnlimited',
            'finalUnlimited',
            'limitedToOne',
            'limitedToTwo',
          ],
          taskMaxAttempts: {
            anotherLimitedToOne: maxAttempts,
          },
        },
      });

      expect(results[3].args.updateByQuery[1].max_docs).toEqual(2);
      expect(results[3].args.updateByQuery[0].script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [],
          claimableTaskTypes: ['limitedToTwo'],
          skippedTaskTypes: [
            'unlimited',
            'limitedToZero',
            'anotherUnlimited',
            'finalUnlimited',
            'limitedToOne',
            'anotherLimitedToOne',
          ],
          taskMaxAttempts: {
            limitedToTwo: maxAttempts,
          },
        },
      });
    });

    test('it should reduce the available capacity from batch to batch', async () => {
      const maxAttempts = _.random(2, 43);
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskManagerId = uuid.v1();
      definitions.registerTaskDefinitions({
        unlimited: {
          title: 'unlimited',
          createTaskRunner: jest.fn(),
        },
        limitedToFive: {
          title: 'limitedToFive',
          maxConcurrency: 5,
          createTaskRunner: jest.fn(),
        },
        limitedToTwo: {
          title: 'limitedToTwo',
          maxConcurrency: 2,
          createTaskRunner: jest.fn(),
        },
      });
      const results = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
          getCapacity: (type) => {
            switch (type) {
              case 'limitedToTwo':
                return 2;
              case 'limitedToFive':
                return 5;
              default:
                return 10;
            }
          },
        },
        hits: [
          [
            // 7 returned by unlimited query
            mockInstance({
              taskType: 'unlimited',
            }),
            mockInstance({
              taskType: 'unlimited',
            }),
            mockInstance({
              taskType: 'unlimited',
            }),
            mockInstance({
              taskType: 'unlimited',
            }),
            mockInstance({
              taskType: 'unlimited',
            }),
            mockInstance({
              taskType: 'unlimited',
            }),
            mockInstance({
              taskType: 'unlimited',
            }),
          ],
          // 2 returned by limitedToFive query
          [
            mockInstance({
              taskType: 'limitedToFive',
            }),
            mockInstance({
              taskType: 'limitedToFive',
            }),
          ],
          // 1 reterned by limitedToTwo query
          [
            mockInstance({
              taskType: 'limitedToTwo',
            }),
          ],
        ],
        claimingOpts: {
          claimOwnershipUntil: new Date(),
          claimTasksById: [],
        },
      });

      expect(results.length).toEqual(3);

      expect(results[0].args.updateByQuery[1].max_docs).toEqual(10);

      // only capacity for 3, even though 5 are allowed
      expect(results[1].args.updateByQuery[1].max_docs).toEqual(3);

      // only capacity for 1, even though 2 are allowed
      expect(results[2].args.updateByQuery[1].max_docs).toEqual(1);
    });

    test('it shuffles the types claimed in batches to ensure no type starves another', async () => {
      const maxAttempts = _.random(2, 43);
      const definitions = new TaskTypeDictionary(mockLogger());
      const taskManagerId = uuid.v1();
      definitions.registerTaskDefinitions({
        unlimited: {
          title: 'unlimited',
          createTaskRunner: jest.fn(),
        },
        anotherUnlimited: {
          title: 'anotherUnlimited',
          createTaskRunner: jest.fn(),
        },
        finalUnlimited: {
          title: 'finalUnlimited',
          createTaskRunner: jest.fn(),
        },
        limitedToOne: {
          title: 'limitedToOne',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
        anotherLimitedToOne: {
          title: 'anotherLimitedToOne',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
        limitedToTwo: {
          title: 'limitedToTwo',
          maxConcurrency: 2,
          createTaskRunner: jest.fn(),
        },
      });

      const { taskClaiming, store } = initialiseTestClaiming({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
          getCapacity: (type) => {
            switch (type) {
              case 'limitedToOne':
              case 'anotherLimitedToOne':
                return 1;
              case 'limitedToTwo':
                return 2;
              default:
                return 10;
            }
          },
        },
      });

      async function getUpdateByQueryScriptParams() {
        return (
          await getAllAsPromise(
            taskClaiming.claimAvailableTasks({
              claimOwnershipUntil: new Date(),
            })
          )
        ).map(
          (result, index) =>
            (
              store.updateByQuery.mock.calls[index][0] as {
                query: MustNotCondition;
                size: number;
                sort: string | string[];
                script: {
                  params: {
                    [claimableTaskTypes: string]: string[];
                  };
                };
              }
            ).script.params.claimableTaskTypes
        );
      }

      const firstCycle = await getUpdateByQueryScriptParams();
      store.updateByQuery.mockClear();
      const secondCycle = await getUpdateByQueryScriptParams();

      expect(firstCycle.length).toEqual(4);
      expect(secondCycle.length).toEqual(4);
      expect(firstCycle).not.toMatchObject(secondCycle);
    });

    test('it passes any unusedTaskTypes to script', async () => {
      const maxAttempts = _.random(2, 43);
      const customMaxAttempts = _.random(44, 100);
      const taskManagerId = uuid.v1();
      const fieldUpdates = {
        ownerId: taskManagerId,
        retryAt: new Date(Date.now()),
      };
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        foo: {
          title: 'foo',
          createTaskRunner: jest.fn(),
        },
        bar: {
          title: 'bar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
        foobar: {
          title: 'foobar',
          maxAttempts: customMaxAttempts,
          createTaskRunner: jest.fn(),
        },
      });

      const [
        {
          args: {
            updateByQuery: [{ query, script }],
          },
        },
      ] = await testClaimAvailableTasks({
        storeOpts: {
          definitions,
          taskManagerId,
        },
        taskClaimingOpts: {
          maxAttempts,
        },
        claimingOpts: {
          claimOwnershipUntil: new Date(),
        },
        excludedTaskTypes: ['foobar'],
        unusedTaskTypes: ['barfoo'],
      });
      expect(query).toMatchObject({
        bool: {
          must: [
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
          filter: [
            {
              bool: {
                must_not: [
                  {
                    bool: {
                      should: [
                        { term: { 'task.status': 'running' } },
                        { term: { 'task.status': 'claiming' } },
                      ],
                      must: { range: { 'task.retryAt': { gt: 'now' } } },
                    },
                  },
                ],
              },
            },
          ],
        },
      });
      expect(script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [],
          claimableTaskTypes: ['foo', 'bar'],
          skippedTaskTypes: ['foobar'],
          unusedTaskTypes: ['barfoo'],
          taskMaxAttempts: {
            bar: customMaxAttempts,
            foo: maxAttempts,
          },
        },
      });
    });

    test('it claims tasks by setting their ownerId, status and retryAt', async () => {
      const taskManagerId = uuid.v1();
      const claimOwnershipUntil = new Date(Date.now());
      const fieldUpdates = {
        ownerId: taskManagerId,
        retryAt: claimOwnershipUntil,
      };
      const [
        {
          args: {
            updateByQuery: [{ script }],
          },
        },
      ] = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil,
        },
      });
      expect(script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimableTaskTypes: ['report', 'dernstraight', 'yawn'],
          skippedTaskTypes: [],
          taskMaxAttempts: {
            dernstraight: 2,
            report: 2,
            yawn: 2,
          },
        },
      });
    });

    test('it filters out running tasks', async () => {
      const taskManagerId = uuid.v1();
      const claimOwnershipUntil = new Date(Date.now());
      const runAt = new Date();
      const tasks = [
        mockInstance({
          id: 'aaa',
          runAt,
          taskType: 'foo',
          schedule: undefined,
          attempts: 0,
          status: TaskStatus.Claiming,
          params: { hello: 'world' },
          state: { baby: 'Henhen' },
          user: 'jimbo',
          scope: ['reporting'],
          ownerId: taskManagerId,
        }),
      ];
      const [
        {
          result: { docs },
          args: {
            search: { query },
          },
        },
      ] = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil,
        },
        hits: [tasks],
      });

      expect(query).toMatchObject({
        bool: {
          must: [
            {
              term: {
                'task.ownerId': taskManagerId,
              },
            },
            { term: { 'task.status': 'claiming' } },
            {
              bool: {
                should: [
                  {
                    term: {
                      'task.taskType': 'report',
                    },
                  },
                  {
                    term: {
                      'task.taskType': 'dernstraight',
                    },
                  },
                  {
                    term: {
                      'task.taskType': 'yawn',
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      expect(docs).toMatchObject([
        {
          attempts: 0,
          id: 'aaa',
          schedule: undefined,
          params: { hello: 'world' },
          runAt,
          scope: ['reporting'],
          state: { baby: 'Henhen' },
          status: 'claiming',
          taskType: 'foo',
          user: 'jimbo',
          ownerId: taskManagerId,
        },
      ]);
    });

    test('it returns task objects', async () => {
      const taskManagerId = uuid.v1();
      const claimOwnershipUntil = new Date(Date.now());
      const runAt = new Date();
      const tasks = [
        mockInstance({
          id: 'aaa',
          runAt,
          taskType: 'foo',
          schedule: undefined,
          attempts: 0,
          status: TaskStatus.Claiming,
          params: { hello: 'world' },
          state: { baby: 'Henhen' },
          user: 'jimbo',
          scope: ['reporting'],
          ownerId: taskManagerId,
        }),
        mockInstance({
          id: 'bbb',
          runAt,
          taskType: 'bar',
          schedule: { interval: '5m' },
          attempts: 2,
          status: TaskStatus.Claiming,
          params: { shazm: 1 },
          state: { henry: 'The 8th' },
          user: 'dabo',
          scope: ['reporting', 'ceo'],
          ownerId: taskManagerId,
        }),
      ];
      const [
        {
          result: { docs },
          args: {
            search: { query },
          },
        },
      ] = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil,
        },
        hits: [tasks],
      });

      expect(query).toMatchObject({
        bool: {
          must: [
            {
              term: {
                'task.ownerId': taskManagerId,
              },
            },
            { term: { 'task.status': 'claiming' } },
            {
              bool: {
                should: [
                  {
                    term: {
                      'task.taskType': 'report',
                    },
                  },
                  {
                    term: {
                      'task.taskType': 'dernstraight',
                    },
                  },
                  {
                    term: {
                      'task.taskType': 'yawn',
                    },
                  },
                ],
              },
            },
          ],
        },
      });

      expect(docs).toMatchObject([
        {
          attempts: 0,
          id: 'aaa',
          schedule: undefined,
          params: { hello: 'world' },
          runAt,
          scope: ['reporting'],
          state: { baby: 'Henhen' },
          status: 'claiming',
          taskType: 'foo',
          user: 'jimbo',
          ownerId: taskManagerId,
        },
        {
          attempts: 2,
          id: 'bbb',
          schedule: { interval: '5m' },
          params: { shazm: 1 },
          runAt,
          scope: ['reporting', 'ceo'],
          state: { henry: 'The 8th' },
          status: 'claiming',
          taskType: 'bar',
          user: 'dabo',
          ownerId: taskManagerId,
        },
      ]);
    });

    test('it returns version_conflicts that do not include conflicts that were proceeded against', async () => {
      const taskManagerId = uuid.v1();
      const claimOwnershipUntil = new Date(Date.now());
      const runAt = new Date();
      const tasks = [
        mockInstance({
          runAt,
          taskType: 'foo',
          schedule: undefined,
          attempts: 0,
          status: TaskStatus.Claiming,
          params: { hello: 'world' },
          state: { baby: 'Henhen' },
          user: 'jimbo',
          scope: ['reporting'],
          ownerId: taskManagerId,
        }),
        mockInstance({
          runAt,
          taskType: 'bar',
          schedule: { interval: '5m' },
          attempts: 2,
          status: TaskStatus.Claiming,
          params: { shazm: 1 },
          state: { henry: 'The 8th' },
          user: 'dabo',
          scope: ['reporting', 'ceo'],
          ownerId: taskManagerId,
        }),
      ];
      const maxDocs = 10;
      const [
        {
          result: {
            stats: { tasksUpdated, tasksConflicted, tasksClaimed },
          },
        },
      ] = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: { getCapacity: () => maxDocs },
        claimingOpts: {
          claimOwnershipUntil,
        },
        hits: [tasks],
        // assume there were 20 version conflists, but thanks to `conflicts="proceed"`
        // we proceeded to claim tasks
        versionConflicts: 20,
      });

      expect(tasksUpdated).toEqual(2);
      // ensure we only count conflicts that *may* have counted against max_docs, no more than that
      expect(tasksConflicted).toEqual(10 - tasksUpdated!);
      expect(tasksClaimed).toEqual(2);
    });
  });

  describe('task events', () => {
    function generateTasks(taskManagerId: string) {
      const runAt = new Date();
      const tasks = [
        {
          id: 'claimed-by-id',
          runAt,
          taskType: 'foo',
          schedule: undefined,
          attempts: 0,
          status: TaskStatus.Claiming,
          params: { hello: 'world' },
          state: { baby: 'Henhen' },
          user: 'jimbo',
          scope: ['reporting'],
          ownerId: taskManagerId,
          startedAt: null,
          retryAt: null,
          scheduledAt: new Date(),
          traceparent: 'parent',
        },
        {
          id: 'claimed-by-schedule',
          runAt,
          taskType: 'bar',
          schedule: { interval: '5m' },
          attempts: 2,
          status: TaskStatus.Claiming,
          params: { shazm: 1 },
          state: { henry: 'The 8th' },
          user: 'dabo',
          scope: ['reporting', 'ceo'],
          ownerId: taskManagerId,
          startedAt: null,
          retryAt: null,
          scheduledAt: new Date(),
          traceparent: 'newParent',
        },
        {
          id: 'already-running',
          runAt,
          taskType: 'bar',
          schedule: { interval: '5m' },
          attempts: 2,
          status: TaskStatus.Running,
          params: { shazm: 1 },
          state: { henry: 'The 8th' },
          user: 'dabo',
          scope: ['reporting', 'ceo'],
          ownerId: taskManagerId,
          startedAt: null,
          retryAt: null,
          scheduledAt: new Date(),
          traceparent: '',
        },
      ];

      return { taskManagerId, runAt, tasks };
    }

    function instantiateStoreWithMockedApiResponses({
      taskManagerId = uuid.v4(),
      definitions = taskDefinitions,
      getCapacity = () => 10,
      tasksClaimed,
    }: Partial<Pick<TaskClaimingOpts, 'definitions' | 'getCapacity'>> & {
      taskManagerId?: string;
      tasksClaimed?: ConcreteTaskInstance[][];
    } = {}) {
      const { runAt, tasks: generatedTasks } = generateTasks(taskManagerId);
      const taskCycles = tasksClaimed ?? [generatedTasks];

      const taskStore = taskStoreMock.create({ taskManagerId });
      taskStore.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));
      for (const docs of taskCycles) {
        taskStore.fetch.mockResolvedValueOnce({ docs });
        taskStore.updateByQuery.mockResolvedValueOnce({
          updated: docs.length,
          version_conflicts: 0,
          total: docs.length,
        });
      }

      taskStore.fetch.mockResolvedValue({ docs: [] });
      taskStore.updateByQuery.mockResolvedValue({
        updated: 0,
        version_conflicts: 0,
        total: 0,
      });

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        definitions,
        excludedTaskTypes: [],
        unusedTypes: [],
        taskStore,
        maxAttempts: 2,
        getCapacity,
      });

      return { taskManagerId, runAt, taskClaiming };
    }

    test('emits an event when a task is succesfully claimed by id', async () => {
      const { taskManagerId, runAt, taskClaiming } = instantiateStoreWithMockedApiResponses();

      const promise = taskClaiming.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, ClaimTaskErr>) => event.id === 'claimed-by-id'
          ),
          take(1)
        )
        .toPromise();

      await getFirstAsPromise(
        taskClaiming.claimAvailableTasks({
          claimTasksById: ['claimed-by-id'],
          claimOwnershipUntil: new Date(),
        })
      );

      const event = await promise;
      expect(event).toMatchObject(
        asTaskClaimEvent(
          'claimed-by-id',
          asOk({
            id: 'claimed-by-id',
            runAt,
            taskType: 'foo',
            schedule: undefined,
            attempts: 0,
            status: 'claiming' as TaskStatus,
            params: { hello: 'world' },
            state: { baby: 'Henhen' },
            user: 'jimbo',
            scope: ['reporting'],
            ownerId: taskManagerId,
            startedAt: null,
            retryAt: null,
            scheduledAt: new Date(),
            traceparent: 'parent',
          })
        )
      );
    });

    test('emits an event when a task is succesfully claimed by id by is rejected as it would exceed maxCapacity of its taskType', async () => {
      const definitions = new TaskTypeDictionary(mockLogger());
      definitions.registerTaskDefinitions({
        unlimited: {
          title: 'unlimited',
          createTaskRunner: jest.fn(),
        },
        limitedToOne: {
          title: 'limitedToOne',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
        anotherLimitedToOne: {
          title: 'anotherLimitedToOne',
          maxConcurrency: 1,
          createTaskRunner: jest.fn(),
        },
      });

      const taskManagerId = uuid.v4();
      const { runAt, taskClaiming } = instantiateStoreWithMockedApiResponses({
        taskManagerId,
        definitions,
        getCapacity: (type) => {
          switch (type) {
            case 'limitedToOne':
              // return 0 as there's already a `limitedToOne` task running
              return 0;
            default:
              return 10;
          }
        },
        tasksClaimed: [
          // find on first claim cycle
          [
            {
              id: 'claimed-by-id-limited-concurrency',
              runAt: new Date(),
              taskType: 'limitedToOne',
              schedule: undefined,
              attempts: 0,
              status: TaskStatus.Claiming,
              params: { hello: 'world' },
              state: { baby: 'Henhen' },
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
              startedAt: null,
              retryAt: null,
              scheduledAt: new Date(),
              traceparent: '',
            },
          ],
          // second cycle
          [
            {
              id: 'claimed-by-schedule-unlimited',
              runAt: new Date(),
              taskType: 'unlimited',
              schedule: undefined,
              attempts: 0,
              status: TaskStatus.Claiming,
              params: { hello: 'world' },
              state: { baby: 'Henhen' },
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
              startedAt: null,
              retryAt: null,
              scheduledAt: new Date(),
              traceparent: '',
            },
          ],
        ],
      });

      const promise = taskClaiming.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, ClaimTaskErr>) =>
              event.id === 'claimed-by-id-limited-concurrency'
          ),
          take(1)
        )
        .toPromise();

      const [firstCycleResult, secondCycleResult] = await getAllAsPromise(
        taskClaiming.claimAvailableTasks({
          claimTasksById: ['claimed-by-id-limited-concurrency'],
          claimOwnershipUntil: new Date(),
        })
      );

      expect(firstCycleResult.stats.tasksClaimed).toEqual(0);
      expect(firstCycleResult.stats.tasksRejected).toEqual(1);
      expect(firstCycleResult.stats.tasksUpdated).toEqual(1);

      // values accumulate from cycle to cycle
      expect(secondCycleResult.stats.tasksClaimed).toEqual(0);
      expect(secondCycleResult.stats.tasksRejected).toEqual(1);
      expect(secondCycleResult.stats.tasksUpdated).toEqual(1);

      const event = await promise;
      expect(event).toMatchObject(
        asTaskClaimEvent(
          'claimed-by-id-limited-concurrency',
          asErr({
            task: some({
              id: 'claimed-by-id-limited-concurrency',
              runAt,
              taskType: 'limitedToOne',
              schedule: undefined,
              attempts: 0,
              status: 'claiming' as TaskStatus,
              params: { hello: 'world' },
              state: { baby: 'Henhen' },
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
              startedAt: null,
              retryAt: null,
              scheduledAt: new Date(),
              traceparent: '',
            }),
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_OUT_OF_CAPACITY,
          })
        )
      );
    });

    test('emits an event when a task is succesfully by scheduling', async () => {
      const { taskManagerId, runAt, taskClaiming } = instantiateStoreWithMockedApiResponses();

      const promise = taskClaiming.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, ClaimTaskErr>) =>
              event.id === 'claimed-by-schedule'
          ),
          take(1)
        )
        .toPromise();

      await getFirstAsPromise(
        taskClaiming.claimAvailableTasks({
          claimTasksById: ['claimed-by-id'],
          claimOwnershipUntil: new Date(),
        })
      );

      const event = await promise;
      expect(event).toMatchObject(
        asTaskClaimEvent(
          'claimed-by-schedule',
          asOk({
            id: 'claimed-by-schedule',
            runAt,
            taskType: 'bar',
            schedule: { interval: '5m' },
            attempts: 2,
            status: 'claiming' as TaskStatus,
            params: { shazm: 1 },
            state: { henry: 'The 8th' },
            user: 'dabo',
            scope: ['reporting', 'ceo'],
            ownerId: taskManagerId,
            startedAt: null,
            retryAt: null,
            scheduledAt: new Date(),
            traceparent: 'newParent',
          })
        )
      );
    });

    test('emits an event when the store fails to claim a required task by id', async () => {
      const { taskManagerId, runAt, taskClaiming } = instantiateStoreWithMockedApiResponses();

      const promise = taskClaiming.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, ClaimTaskErr>) => event.id === 'already-running'
          ),
          take(1)
        )
        .toPromise();

      await getFirstAsPromise(
        taskClaiming.claimAvailableTasks({
          claimTasksById: ['already-running'],
          claimOwnershipUntil: new Date(),
        })
      );

      const event = await promise;
      expect(event).toMatchObject(
        asTaskClaimEvent(
          'already-running',
          asErr({
            task: some({
              id: 'already-running',
              runAt,
              taskType: 'bar',
              schedule: { interval: '5m' },
              attempts: 2,
              status: 'running' as TaskStatus,
              params: { shazm: 1 },
              state: { henry: 'The 8th' },
              user: 'dabo',
              scope: ['reporting', 'ceo'],
              ownerId: taskManagerId,
              startedAt: null,
              retryAt: null,
              scheduledAt: new Date(),
              traceparent: '',
            }),
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_IN_CLAIMING_STATUS,
          })
        )
      );
    });

    test('emits an event when the store fails to find a task which was required by id', async () => {
      const { taskClaiming } = instantiateStoreWithMockedApiResponses();

      const promise = taskClaiming.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, ClaimTaskErr>) => event.id === 'unknown-task'
          ),
          take(1)
        )
        .toPromise();

      await getFirstAsPromise(
        taskClaiming.claimAvailableTasks({
          claimTasksById: ['unknown-task'],
          claimOwnershipUntil: new Date(),
        })
      );

      const event = await promise;
      expect(event).toMatchObject(
        asTaskClaimEvent(
          'unknown-task',
          asErr({
            task: none,
            errorType: TaskClaimErrorType.CLAIMED_BY_ID_NOT_RETURNED,
          })
        )
      );
    });
  });
});

function generateFakeTasks(count: number = 1) {
  return _.times(count, (index) => mockInstance({ id: `task:id-${index}` }));
}

function mockInstance(instance: Partial<ConcreteTaskInstance> = {}) {
  return Object.assign(
    {
      id: uuid.v4(),
      taskType: 'bar',
      sequenceNumber: 32,
      primaryTerm: 32,
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: null,
      retryAt: null,
      attempts: 0,
      params: {},
      scope: ['reporting'],
      state: {},
      status: 'idle',
      user: 'example',
      ownerId: null,
      traceparent: '',
    },
    instance
  );
}

function getFirstAsPromise<T>(obs$: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs$.subscribe(resolve, reject);
  });
}
function getAllAsPromise<T>(obs$: Observable<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    obs$.pipe(toArray()).subscribe(resolve, reject);
  });
}
