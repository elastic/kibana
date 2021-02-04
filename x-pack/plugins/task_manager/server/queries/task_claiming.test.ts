/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import uuid from 'uuid';
import { filter, take, first, toArray } from 'rxjs/operators';
import { some, none } from 'fp-ts/lib/Option';
import { RequestEvent } from '@elastic/elasticsearch/lib/Transport';
import { Search, UpdateByQuery } from '@elastic/elasticsearch/api/requestParams';
import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';

import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import { SavedObjectsSerializer, SavedObjectTypeRegistry } from 'src/core/server';

import { TaskStatus, ConcreteTaskInstance } from '../task';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { StoreOpts, TaskStore } from '../task_store';
import { asTaskClaimEvent, ClaimTaskErr, TaskClaimErrorType, TaskEvent } from '../task_events';
import { asOk, asErr } from '../lib/result_type';
import { TaskTypeDictionary } from '../task_type_dictionary';
import { BoolClauseWithAnyCondition, TermFilter } from '../queries/query_clauses';
import { mockLogger } from '../test_utils';
import { TaskClaiming, OwnershipClaimingOpts, TaskClaimingOpts } from './task_claiming';
import { Observable } from 'rxjs';

const taskManagerLogger = mockLogger();
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

describe('TaskClaiming', () => {
  describe('claimAvailableTasks', () => {
    function initialiseTestClaiming({
      storeOpts = {},
      taskClaimingOpts = {},
      hits = generateFakeTasks(1),
      versionConflicts = 2,
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      hits?: unknown[];
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
        logger: taskManagerLogger,
        definitions,
        taskStore: store,
        maxAttempts: taskClaimingOpts.maxAttempts ?? 2,
        getCapacity: taskClaimingOpts.getCapacity ?? (() => 10),
        ...taskClaimingOpts,
      });

      return { taskClaiming, esClient };
    }

    async function testClaimAvailableTasks({
      storeOpts = {},
      taskClaimingOpts = {},
      claimingOpts,
      hits = generateFakeTasks(1),
      versionConflicts = 2,
    }: {
      storeOpts: Partial<StoreOpts>;
      taskClaimingOpts: Partial<TaskClaimingOpts>;
      claimingOpts: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>;
      hits?: unknown[];
      versionConflicts?: number;
    }) {
      const getCapacity = taskClaimingOpts.getCapacity ?? (() => 10);
      const { taskClaiming, esClient } = initialiseTestClaiming({
        storeOpts,
        taskClaimingOpts,
        hits,
        versionConflicts,
      });

      const results = await getAllAsPromise(taskClaiming.claimAvailableTasks(claimingOpts));

      expect(esClient.updateByQuery.mock.calls[0][0]).toMatchObject({
        max_docs: getCapacity(),
      });
      expect(esClient.search.mock.calls[0][0]).toMatchObject({
        body: { size: getCapacity() },
      });
      return results.map((result, index) => ({
        result,
        args: {
          search: esClient.search.mock.calls[index][0] as Required<
            Search<{
              query: BoolClauseWithAnyCondition<TermFilter>;
              size: number;
              sort: string | string[];
            }>
          >,
          updateByQuery: esClient.updateByQuery.mock.calls[index][0] as Required<
            UpdateByQuery<{
              query: BoolClauseWithAnyCondition<TermFilter>;
              size: number;
              sort: string | string[];
              script: object;
            }>
          >,
        },
      }));
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
        logger: taskManagerLogger,
        definitions: taskDefinitions,
        taskStore: store,
        maxAttempts: 2,
        getCapacity: () => 10,
      });
      const { docs } = await getFirstAsPromise(
        taskClaiming.claimAvailableTasks({
          claimOwnershipUntil: new Date(),
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

      const [
        {
          args: {
            updateByQuery: {
              body: { query, sort },
            },
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
      const [
        {
          args: {
            updateByQuery: {
              body: { query, script, sort },
            },
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

      expect(results[0].args.updateByQuery.max_docs).toEqual(10);
      expect(results[0].args.updateByQuery.body.script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [
            'task:33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
            'task:a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
          ],
          claimableTaskTypes: ['unlimited', 'anotherUnlimited', 'finalUnlimited'],
          skippedTaskTypes: ['limitedToOne', 'anotherLimitedToOne', 'limitedToTwo'],
          taskMaxAttempts: {
            unlimited: maxAttempts,
          },
        },
      });

      expect(results[1].args.updateByQuery.max_docs).toEqual(1);
      expect(results[1].args.updateByQuery.body.script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [],
          claimableTaskTypes: ['limitedToOne'],
          skippedTaskTypes: [
            'unlimited',
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

      expect(results[2].args.updateByQuery.max_docs).toEqual(1);
      expect(results[2].args.updateByQuery.body.script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [],
          claimableTaskTypes: ['anotherLimitedToOne'],
          skippedTaskTypes: [
            'unlimited',
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

      expect(results[3].args.updateByQuery.max_docs).toEqual(2);
      expect(results[3].args.updateByQuery.body.script).toMatchObject({
        source: expect.any(String),
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [],
          claimableTaskTypes: ['limitedToTwo'],
          skippedTaskTypes: [
            'unlimited',
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

      const { taskClaiming, esClient } = initialiseTestClaiming({
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
            (esClient.updateByQuery.mock.calls[index][0] as Required<
              UpdateByQuery<{
                query: BoolClauseWithAnyCondition<TermFilter>;
                size: number;
                sort: string | string[];
                script: {
                  params: {
                    claimableTaskTypes: string[];
                  };
                };
              }>
            >).body.script.params.claimableTaskTypes
        );
      }

      const firstCycle = await getUpdateByQueryScriptParams();
      esClient.updateByQuery.mockClear();
      const secondCycle = await getUpdateByQueryScriptParams();

      expect(firstCycle.length).toEqual(4);
      expect(secondCycle.length).toEqual(4);
      expect(firstCycle).not.toMatchObject(secondCycle);
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
            updateByQuery: {
              body: { script },
            },
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
      const [
        {
          result: { docs },
          args: {
            search: {
              body: { query },
            },
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
      const [
        {
          result: { docs },
          args: {
            search: {
              body: { query },
            },
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
      const [
        {
          result: { docs },
          args: {
            search: {
              body: { query },
            },
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
        logger: taskManagerLogger,
        definitions: taskDefinitions,
        taskStore: store,
        maxAttempts: 2,
        getCapacity: () => 10,
      });

      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      esClient.updateByQuery.mockRejectedValue(new Error('Failure'));
      await expect(
        getFirstAsPromise(
          taskClaiming.claimAvailableTasks({
            claimOwnershipUntil: new Date(),
          })
        )
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('task events', () => {
    function generateTasks(taskManagerId: string) {
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

    function instantiateStoreWithMockedApiResponses({
      taskManagerId = uuid.v4(),
      definitions = taskDefinitions,
      getCapacity = () => 10,
      tasksClaimed,
    }: Partial<Pick<TaskClaimingOpts, 'definitions' | 'getCapacity'>> & {
      taskManagerId?: string;
      tasksClaimed?: Array<ReturnType<typeof generateTasks>['tasks']>;
    } = {}) {
      const { runAt, tasks: generatedTasks } = generateTasks(taskManagerId);
      const taskCycles = tasksClaimed ?? [generatedTasks];

      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      for (const tasks of taskCycles) {
        esClient.search.mockReturnValueOnce(asApiResponse({ hits: { hits: tasks } }));
        esClient.updateByQuery.mockReturnValueOnce(
          asApiResponse({
            total: tasks.length,
            updated: tasks.length,
          })
        );
      }

      const store = new TaskStore({
        esClient,
        definitions,
        serializer,
        savedObjectsRepository: savedObjectsClient,
        taskManagerId,
        index: '',
      });
      const taskClaiming = new TaskClaiming({
        logger: taskManagerLogger,
        definitions,
        taskStore: store,
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
              _id: 'task:claimed-by-id-limited-concurrency',
              _source: {
                type: 'task',
                task: {
                  runAt: new Date(),
                  taskType: 'limitedToOne',
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
          ],
          // second cycle
          [
            {
              _id: 'task:claimed-by-schedule-unlimited',
              _source: {
                type: 'task',
                task: {
                  runAt: new Date(),
                  taskType: 'unlimited',
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
function getAllAsPromise<T>(obs$: Observable<T>): Promise<T[]> {
  return new Promise((resolve, reject) => {
    obs$.pipe(toArray()).subscribe(resolve, reject);
  });
}

const asApiResponse = <T>(body: T): TransportRequestPromise<RequestEvent<T>> =>
  Promise.resolve({
    body,
  }) as TransportRequestPromise<RequestEvent<T>>;
