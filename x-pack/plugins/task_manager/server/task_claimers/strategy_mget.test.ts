/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { filter, take, toArray } from 'rxjs';
import { CLAIM_STRATEGY_MGET } from '../config';

import {
  TaskStatus,
  ConcreteTaskInstance,
  ConcreteTaskInstanceVersion,
  TaskPriority,
} from '../task';
import { SearchOpts, StoreOpts } from '../task_store';
import { asTaskClaimEvent, TaskEvent } from '../task_events';
import { asOk, isOk, unwrap } from '../lib/result_type';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { mockLogger } from '../test_utils';
import {
  TaskClaiming,
  OwnershipClaimingOpts,
  TaskClaimingOpts,
  TASK_MANAGER_MARK_AS_CLAIMED,
} from '../queries/task_claiming';
import { Observable } from 'rxjs';
import { taskStoreMock } from '../task_store.mock';
import apm from 'elastic-apm-node';
import { TASK_MANAGER_TRANSACTION_TYPE } from '../task_running';
import { ClaimOwnershipResult } from '.';
import { FillPoolResult } from '../lib/fill_pool';
import { TaskPartitioner } from '../lib/task_partitioner';
import type { MustNotCondition } from '../queries/query_clauses';
import {
  createDiscoveryServiceMock,
  createFindSO,
} from '../kibana_discovery_service/mock_kibana_discovery_service';

jest.mock('../lib/assign_pod_partitions', () => ({
  assignPodPartitions: jest.fn().mockReturnValue([1, 3]),
}));

jest.mock('../constants', () => ({
  CONCURRENCY_ALLOW_LIST_BY_TASK_TYPE: [
    'limitedToZero',
    'limitedToOne',
    'anotherLimitedToZero',
    'anotherLimitedToOne',
    'limitedToTwo',
    'limitedToFive',
  ],
}));

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

const discoveryServiceMock = createDiscoveryServiceMock('test');
const lastSeen = '2024-08-10T10:00:00.000Z';
discoveryServiceMock.getActiveKibanaNodes.mockResolvedValue([
  createFindSO('test', lastSeen),
  createFindSO('test-pod-2', lastSeen),
  createFindSO('test-pod-3', lastSeen),
]);
const taskPartitioner = new TaskPartitioner('test', discoveryServiceMock);

// needs more tests in the similar to the `strategy_default.test.ts` test suite
describe('TaskClaiming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(apm, 'startTransaction')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => mockApmTrans as any);
  });

  describe('claimAvailableTasks', () => {
    function initialiseTestClaiming({
      storeOpts = {},
      taskClaimingOpts = {},
      hits,
      versionMaps,
      excludedTaskTypes = [],
      unusedTaskTypes = [],
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      hits?: ConcreteTaskInstance[][];
      versionMaps?: Array<Map<string, ConcreteTaskInstanceVersion>>;
      excludedTaskTypes?: string[];
      unusedTaskTypes?: string[];
    }) {
      const definitions = storeOpts.definitions ?? taskDefinitions;
      const store = taskStoreMock.create({ taskManagerId: storeOpts.taskManagerId });
      store.convertToSavedObjectIds.mockImplementation((ids) => ids.map((id) => `task:${id}`));

      if (hits == null) hits = [generateFakeTasks(1)];
      if (versionMaps == null) {
        versionMaps = [new Map<string, ConcreteTaskInstanceVersion>()];
        for (const oneHit of hits) {
          const map = new Map<string, ConcreteTaskInstanceVersion>();
          versionMaps.push(map);
          for (const task of oneHit) {
            map.set(task.id, { esId: task.id, seqNo: 32, primaryTerm: 32 });
          }
        }
      }

      for (let i = 0; i < hits.length; i++) {
        store.fetch.mockResolvedValueOnce({ docs: hits[i], versionMap: versionMaps[i] });
        store.getDocVersions.mockResolvedValueOnce(versionMaps[i]);
        const oneBulkResult = hits[i].map((hit) => asOk(hit));
        store.bulkUpdate.mockResolvedValueOnce(oneBulkResult);
      }

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: CLAIM_STRATEGY_MGET,
        definitions,
        taskStore: store,
        excludedTaskTypes,
        unusedTypes: unusedTaskTypes,
        maxAttempts: taskClaimingOpts.maxAttempts ?? 2,
        getCapacity: taskClaimingOpts.getCapacity ?? (() => 10),
        taskPartitioner,
        ...taskClaimingOpts,
      });

      return { taskClaiming, store };
    }

    async function testClaimAvailableTasks({
      storeOpts = {},
      taskClaimingOpts = {},
      claimingOpts,
      hits = [generateFakeTasks(1)],
      excludedTaskTypes = [],
      unusedTaskTypes = [],
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      claimingOpts: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>;
      hits?: ConcreteTaskInstance[][];
      excludedTaskTypes?: string[];
      unusedTaskTypes?: string[];
    }) {
      const { taskClaiming, store } = initialiseTestClaiming({
        storeOpts,
        taskClaimingOpts,
        excludedTaskTypes,
        unusedTaskTypes,
        hits,
      });

      const resultsOrErr = await getAllAsPromise(
        taskClaiming.claimAvailableTasksIfCapacityIsAvailable(claimingOpts)
      );
      for (const resultOrErr of resultsOrErr) {
        if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
          expect(resultOrErr).toBe(undefined);
        }
      }

      const results = resultsOrErr.map((resultOrErr) => {
        if (!isOk<ClaimOwnershipResult, FillPoolResult>(resultOrErr)) {
          expect(resultOrErr).toBe(undefined);
        }
        return unwrap(resultOrErr) as ClaimOwnershipResult;
      });

      return results.map((result, index) => ({
        result,
        args: {
          search: store.fetch.mock.calls[index][0] as SearchOpts & {
            query: MustNotCondition;
          },
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

      store.fetch.mockReset();
      store.fetch.mockRejectedValue(new Error('Oh no'));

      await expect(
        getAllAsPromise(
          taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
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
          priority: TaskPriority.Low,
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

      const result = await testClaimAvailableTasks({
        storeOpts: { definitions },
        taskClaimingOpts: { maxAttempts },
        claimingOpts: { claimOwnershipUntil: new Date() },
        excludedTaskTypes: ['foobar'],
      });
      expect(result).toMatchObject({});
    });

    test('it should filter for specific partitions and tasks without partitions', async () => {
      const taskManagerId = uuidv4();
      const [
        {
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
          claimOwnershipUntil: new Date(),
        },
      });

      expect(query).toMatchInlineSnapshot(`
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
            "must": Array [
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "term": Object {
                        "task.enabled": true,
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "must": Array [
                    Object {
                      "terms": Object {
                        "task.taskType": Array [
                          "report",
                          "dernstraight",
                          "yawn",
                        ],
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "should": Array [
                    Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "task.status": "idle",
                            },
                          },
                          Object {
                            "range": Object {
                              "task.runAt": Object {
                                "lte": "now",
                              },
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "bool": Object {
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
                          Object {
                            "range": Object {
                              "task.retryAt": Object {
                                "lte": "now",
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
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
              },
            ],
          },
        }
      `);
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
      taskManagerId = uuidv4(),
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
        taskStore.fetch.mockResolvedValueOnce({ docs, versionMap: new Map() });
        taskStore.updateByQuery.mockResolvedValueOnce({
          updated: docs.length,
          version_conflicts: 0,
          total: docs.length,
        });
      }

      taskStore.fetch.mockResolvedValue({ docs: [], versionMap: new Map() });
      taskStore.updateByQuery.mockResolvedValue({
        updated: 0,
        version_conflicts: 0,
        total: 0,
      });

      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        strategy: 'default',
        definitions,
        excludedTaskTypes: [],
        unusedTypes: [],
        taskStore,
        maxAttempts: 2,
        getCapacity,
        taskPartitioner,
      });

      return { taskManagerId, runAt, taskClaiming };
    }

    test('emits an event when a task is succesfully by scheduling', async () => {
      const { taskManagerId, runAt, taskClaiming } = instantiateStoreWithMockedApiResponses();

      const promise = taskClaiming.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, Error>) => event.id === 'claimed-by-schedule'
          ),
          take(1)
        )
        .toPromise();

      await getFirstAsPromise(
        taskClaiming.claimAvailableTasksIfCapacityIsAvailable({
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
  });
});

function generateFakeTasks(count: number = 1) {
  return _.times(count, (index) => mockInstance({ id: `task:id-${index}` }));
}

function mockInstance(instance: Partial<ConcreteTaskInstance> = {}) {
  return Object.assign(
    {
      id: uuidv4(),
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
