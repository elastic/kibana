/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import uuid from 'uuid';
import { filter, take, first } from 'rxjs/operators';
import { some, none } from 'fp-ts/lib/Option';
import { RequestEvent } from '@elastic/elasticsearch/lib/Transport';
import { Search, UpdateByQuery } from '@elastic/elasticsearch/api/requestParams';

import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import { SavedObjectsSerializer, SavedObjectTypeRegistry } from 'src/core/server';

import { TaskStatus, ConcreteTaskInstance } from '../task';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { StoreOpts, OwnershipClaimingOpts, TaskStore } from '../task_store';
import { asTaskClaimEvent, ClaimTaskErr, TaskClaimErrorType, TaskEvent } from '../task_events';
import { asOk, asErr } from '../lib/result_type';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { BoolClauseWithAnyCondition, TermFilter } from '../queries/query_clauses';
import { mockLogger } from '../test_utils';
import { TaskClaiming, TaskClaimingOpts } from './task_claiming';
import { Observable } from 'rxjs';

const savedObjectsClient = savedObjectsRepositoryMock.create();
const serializer = new SavedObjectsSerializer(new SavedObjectTypeRegistry());

beforeEach(() => jest.resetAllMocks());

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

const taskDefinitions = new TaskTypeDictionary(mockLogger());
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

describe('TaskClaiming', () => {
  describe('claimAvailableTasks', () => {
    async function testClaimAvailableTasks({
      storeOpts = {},
      taskClaimingOpts = {},
      hits = generateFakeTasks(1),
      claimingOpts,
      versionConflicts = 2,
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      hits?: unknown[];
      claimingOpts: OwnershipClaimingOpts;
      versionConflicts?: number;
    }) {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue(asApiResponse({ hits: { hits } }));
      esClient.updateByQuery.mockResolvedValue(
        asApiResponse({
          total: hits.length + versionConflicts,
          updated: hits.length,
          version_conflicts: versionConflicts,
        })
      );

      const definitions = storeOpts.definitions ?? taskDefinitions;
      const store = new TaskStore({
        esClient,
        definitions,
        serializer,
        savedObjectsRepository: savedObjectsClient,
        taskManagerId: '',
        index: '',
        ...storeOpts,
      });

      const taskClaiming = new TaskClaiming({
        definitions,
        serializer,
        taskStore: store,
        maxAttempts: taskClaimingOpts.maxAttempts ?? 2,
        ...taskClaimingOpts,
      });

      const result = await getFirstAsPromise(taskClaiming.claimAvailableTasks(claimingOpts));

      expect(esClient.updateByQuery.mock.calls[0][0]).toMatchObject({
        max_docs: claimingOpts.getCapacity(),
      });
      expect(esClient.search.mock.calls[0][0]).toMatchObject({
        body: { size: claimingOpts.getCapacity() },
      });
      return {
        result,
        args: {
          search: esClient.search.mock.calls[0][0]! as Search<{
            query: BoolClauseWithAnyCondition<TermFilter>;
            size: number;
            sort: string | string[];
          }>,
          updateByQuery: esClient.updateByQuery.mock.calls[0][0]! as UpdateByQuery<{
            query: BoolClauseWithAnyCondition<TermFilter>;
            size: number;
            sort: string | string[];
            script: object;
          }>,
        },
      };
    }

    test('it returns normally with no tasks when the index does not exist.', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.updateByQuery.mockResolvedValue(
        asApiResponse({
          total: 0,
          updated: 0,
        })
      );
      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
      const taskClaiming = new TaskClaiming({
        definitions: taskDefinitions,
        serializer,
        taskStore: store,
        maxAttempts: 2,
      });
      const { docs } = await getFirstAsPromise(
        taskClaiming.claimAvailableTasks({
          claimOwnershipUntil: new Date(),
          getCapacity: () => 10,
        })
      );
      expect(esClient.updateByQuery.mock.calls[0][0]).toMatchObject({
        ignore_unavailable: true,
        max_docs: 10,
      });
      expect(docs.length).toBe(0);
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
      });

      const {
        args: {
          updateByQuery: { body: { query, sort } = {} },
        },
      } = await testClaimAvailableTasks({
        storeOpts: {
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
        },
        claimingOpts: {
          claimOwnershipUntil: new Date(),
          getCapacity: () => 10,
        },
      });
      expect(query).toMatchObject({
        bool: {
          must: [
            { term: { type: 'task' } },
            {
              bool: {
                must: [
                  {
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
      const {
        args: {
          updateByQuery: { body: { query, script, sort } = {} },
        },
      } = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
          definitions,
        },
        taskClaimingOpts: {
          maxAttempts,
        },
        claimingOpts: {
          claimOwnershipUntil: new Date(),
          getCapacity: () => 10,
          claimTasksById: [
            '33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
            'a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
          ],
        },
      });

      expect(query).toMatchObject({
        bool: {
          must: [
            { term: { type: 'task' } },
            {
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

    test('it claims tasks by setting their ownerId, status and retryAt', async () => {
      const taskManagerId = uuid.v1();
      const claimOwnershipUntil = new Date(Date.now());
      const fieldUpdates = {
        ownerId: taskManagerId,
        retryAt: claimOwnershipUntil,
      };
      const {
        args: {
          updateByQuery: { body: { script } = {} },
        },
      } = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil,
          getCapacity: () => 10,
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
        {
          _id: 'task:aaa',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'foo',
              schedule: undefined,
              attempts: 0,
              status: 'claiming',
              params: '{ "hello": "world" }',
              state: '{ "baby": "Henhen" }',
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 1,
          _primary_term: 2,
          sort: ['a', 1],
        },
        {
          // this is invalid as it doesn't have the `type` prefix
          _id: 'bbb',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              schedule: { interval: '5m' },
              attempts: 2,
              status: 'claiming',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 3,
          _primary_term: 4,
          sort: ['b', 2],
        },
      ];
      const {
        result: { docs },
        args: {
          search: { body: { query } = {} },
        },
      } = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil,
          getCapacity: () => 10,
        },
        hits: tasks,
      });

      expect(query?.bool?.must).toContainEqual({
        bool: {
          must: [
            {
              term: {
                'task.ownerId': taskManagerId,
              },
            },
            { term: { 'task.status': 'claiming' } },
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

    test('it filters out invalid tasks that arent SavedObjects', async () => {
      const taskManagerId = uuid.v1();
      const claimOwnershipUntil = new Date(Date.now());
      const runAt = new Date();
      const tasks = [
        {
          _id: 'task:aaa',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'foo',
              schedule: undefined,
              attempts: 0,
              status: 'claiming',
              params: '{ "hello": "world" }',
              state: '{ "baby": "Henhen" }',
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 1,
          _primary_term: 2,
          sort: ['a', 1],
        },
        {
          _id: 'task:bbb',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              schedule: { interval: '5m' },
              attempts: 2,
              status: 'running',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 3,
          _primary_term: 4,
          sort: ['b', 2],
        },
      ];
      const {
        result: { docs } = {},
        args: {
          search: { body: { query } = {} },
        },
      } = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil,
          getCapacity: () => 10,
        },
        hits: tasks,
      });

      expect(query?.bool?.must).toContainEqual({
        bool: {
          must: [
            {
              term: {
                'task.ownerId': taskManagerId,
              },
            },
            { term: { 'task.status': 'claiming' } },
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
        {
          _id: 'task:aaa',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'foo',
              schedule: undefined,
              attempts: 0,
              status: 'claiming',
              params: '{ "hello": "world" }',
              state: '{ "baby": "Henhen" }',
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 1,
          _primary_term: 2,
          sort: ['a', 1],
        },
        {
          _id: 'task:bbb',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              schedule: { interval: '5m' },
              attempts: 2,
              status: 'claiming',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 3,
          _primary_term: 4,
          sort: ['b', 2],
        },
      ];
      const {
        result: { docs } = {},
        args: {
          search: { body: { query } = {} },
        },
      } = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil,
          getCapacity: () => 10,
        },
        hits: tasks,
      });

      expect(query?.bool?.must).toContainEqual({
        bool: {
          must: [
            {
              term: {
                'task.ownerId': taskManagerId,
              },
            },
            { term: { 'task.status': 'claiming' } },
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
        {
          _id: 'task:aaa',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'foo',
              schedule: undefined,
              attempts: 0,
              status: 'claiming',
              params: '{ "hello": "world" }',
              state: '{ "baby": "Henhen" }',
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 1,
          _primary_term: 2,
          sort: ['a', 1],
        },
        {
          _id: 'task:bbb',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              schedule: { interval: '5m' },
              attempts: 2,
              status: 'claiming',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
              ownerId: taskManagerId,
            },
          },
          _seq_no: 3,
          _primary_term: 4,
          sort: ['b', 2],
        },
      ];
      const maxDocs = 10;
      const {
        result: { stats: { tasksUpdated, tasksConflicted, tasksClaimed } = {} } = {},
      } = await testClaimAvailableTasks({
        storeOpts: {
          taskManagerId,
        },
        taskClaimingOpts: {},
        claimingOpts: {
          claimOwnershipUntil,
          getCapacity: () => maxDocs,
        },
        hits: tasks,
        // assume there were 20 version conflists, but thanks to `conflicts="proceed"`
        // we proceeded to claim tasks
        versionConflicts: 20,
      });

      expect(tasksUpdated).toEqual(2);
      // ensure we only count conflicts that *may* have counted against max_docs, no more than that
      expect(tasksConflicted).toEqual(10 - tasksUpdated!);
      expect(tasksClaimed).toEqual(2);
    });

    test('pushes error from saved objects client to errors$', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
      const taskClaiming = new TaskClaiming({
        definitions: taskDefinitions,
        serializer,
        taskStore: store,
        maxAttempts: 2,
      });

      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      esClient.updateByQuery.mockRejectedValue(new Error('Failure'));
      await expect(
        getFirstAsPromise(
          taskClaiming.claimAvailableTasks({
            claimOwnershipUntil: new Date(),
            getCapacity: () => 10,
          })
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('task events', () => {
    function generateTasks() {
      const taskManagerId = uuid.v1();
      const runAt = new Date();
      const tasks = [
        {
          _id: 'task:claimed-by-id',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'foo',
              schedule: undefined,
              attempts: 0,
              status: 'claiming',
              params: '{ "hello": "world" }',
              state: '{ "baby": "Henhen" }',
              user: 'jimbo',
              scope: ['reporting'],
              ownerId: taskManagerId,
              startedAt: null,
              retryAt: null,
              scheduledAt: new Date(),
            },
          },
          _seq_no: 1,
          _primary_term: 2,
          sort: ['a', 1],
        },
        {
          _id: 'task:claimed-by-schedule',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              schedule: { interval: '5m' },
              attempts: 2,
              status: 'claiming',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
              ownerId: taskManagerId,
              startedAt: null,
              retryAt: null,
              scheduledAt: new Date(),
            },
          },
          _seq_no: 3,
          _primary_term: 4,
          sort: ['b', 2],
        },
        {
          _id: 'task:already-running',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              schedule: { interval: '5m' },
              attempts: 2,
              status: 'running',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
              ownerId: taskManagerId,
              startedAt: null,
              retryAt: null,
              scheduledAt: new Date(),
            },
          },
          _seq_no: 3,
          _primary_term: 4,
          sort: ['b', 2],
        },
      ];

      return { taskManagerId, runAt, tasks };
    }

    function instantiateStoreWithMockedApiResponses() {
      const { taskManagerId, runAt, tasks } = generateTasks();

      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue(asApiResponse({ hits: { hits: tasks } }));
      esClient.updateByQuery.mockResolvedValue(
        asApiResponse({
          total: tasks.length,
          updated: tasks.length,
        })
      );

      const store = new TaskStore({
        esClient,
        definitions: taskDefinitions,
        serializer,
        savedObjectsRepository: savedObjectsClient,
        taskManagerId,
        index: '',
      });
      const taskClaiming = new TaskClaiming({
        definitions: taskDefinitions,
        serializer,
        taskStore: store,
        maxAttempts: 2,
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
          getCapacity: () => 10,
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
          getCapacity: () => 10,
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
          getCapacity: () => 10,
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
          getCapacity: () => 10,
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
  return _.times(count, (index) => ({
    _id: `task:id-${index}`,
    _source: {
      type: 'task',
      task: {},
    },
    _seq_no: _.random(1, 5),
    _primary_term: _.random(1, 5),
    sort: ['a', _.random(1, 5)],
  }));
}

function getFirstAsPromise<T>(obs$: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs$.subscribe(resolve, reject);
  });
}

const asApiResponse = <T>(body: T): RequestEvent<T> =>
  ({
    body,
  } as RequestEvent<T>);
