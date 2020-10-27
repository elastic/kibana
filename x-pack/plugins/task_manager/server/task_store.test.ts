/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import uuid from 'uuid';
import { filter, take, first } from 'rxjs/operators';
import { Option, some, none } from 'fp-ts/lib/Option';

import {
  TaskInstance,
  TaskStatus,
  TaskLifecycleResult,
  SerializedConcreteTaskInstance,
  ConcreteTaskInstance,
} from './task';
import { elasticsearchServiceMock } from '../../../../src/core/server/mocks';
import { StoreOpts, OwnershipClaimingOpts, TaskStore, SearchOpts } from './task_store';
import { savedObjectsRepositoryMock } from 'src/core/server/mocks';
import {
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
  SavedObjectAttributes,
  SavedObjectsErrorHelpers,
} from 'src/core/server';
import { asTaskClaimEvent, TaskEvent } from './task_events';
import { asOk, asErr } from './lib/result_type';
import { TaskTypeDictionary } from './task_type_dictionary';
import { RequestEvent } from '@elastic/elasticsearch/lib/Transport';
import { Search, UpdateByQuery } from '@elastic/elasticsearch/api/requestParams';
import { BoolClauseWithAnyCondition, TermFilter } from './queries/query_clauses';
import { mockLogger } from './test_utils';

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

describe('TaskStore', () => {
  describe('schedule', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
    });

    async function testSchedule(task: unknown) {
      savedObjectsClient.create.mockImplementation(async (type: string, attributes: unknown) => ({
        id: 'testid',
        type,
        attributes,
        references: [],
        version: '123',
      }));
      const result = await store.schedule(task as TaskInstance);

      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);

      return result;
    }

    test('serializes the params and state', async () => {
      const task = {
        id: 'id',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };
      const result = await testSchedule(task);

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        'task',
        {
          attempts: 0,
          schedule: undefined,
          params: '{"hello":"world"}',
          retryAt: null,
          runAt: '2019-02-12T21:01:22.479Z',
          scheduledAt: '2019-02-12T21:01:22.479Z',
          scope: undefined,
          startedAt: null,
          state: '{"foo":"bar"}',
          status: 'idle',
          taskType: 'report',
          user: undefined,
        },
        {
          id: 'id',
          refresh: false,
        }
      );

      expect(result).toEqual({
        id: 'testid',
        attempts: 0,
        schedule: undefined,
        params: { hello: 'world' },
        retryAt: null,
        runAt: mockedDate,
        scheduledAt: mockedDate,
        scope: undefined,
        startedAt: null,
        state: { foo: 'bar' },
        status: 'idle',
        taskType: 'report',
        user: undefined,
        version: '123',
      });
    });

    test('returns a concrete task instance', async () => {
      const task = {
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };
      const result = await testSchedule(task);

      expect(result).toMatchObject({
        ...task,
        id: 'testid',
      });
    });

    test('sets runAt to now if not specified', async () => {
      await testSchedule({ taskType: 'dernstraight', params: {}, state: {} });
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      const attributes = savedObjectsClient.create.mock
        .calls[0][1] as SerializedConcreteTaskInstance;
      expect(new Date(attributes.runAt as string).getTime()).toEqual(mockedDate.getTime());
    });

    test('ensures params and state are not null', async () => {
      await testSchedule({ taskType: 'yawn' });
      expect(savedObjectsClient.create).toHaveBeenCalledTimes(1);
      const attributes = savedObjectsClient.create.mock
        .calls[0][1] as SerializedConcreteTaskInstance;
      expect(attributes.params).toEqual('{}');
      expect(attributes.state).toEqual('{}');
    });

    test('errors if the task type is unknown', async () => {
      await expect(testSchedule({ taskType: 'nope', params: {}, state: {} })).rejects.toThrow(
        /Unsupported task type "nope"/i
      );
    });

    test('pushes error from saved objects client to errors$', async () => {
      const task: TaskInstance = {
        id: 'id',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };

      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.create.mockRejectedValue(new Error('Failure'));
      await expect(store.schedule(task)).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('fetch', () => {
    let store: TaskStore;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];

    beforeAll(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
    });

    async function testFetch(opts?: SearchOpts, hits: unknown[] = []) {
      esClient.search.mockResolvedValue(asApiResponse({ hits: { hits } }));

      const result = await store.fetch(opts);

      expect(esClient.search).toHaveBeenCalledTimes(1);

      return {
        result,
        args: esClient.search.mock.calls[0][0],
      };
    }

    test('empty call filters by type, sorts by runAt and id', async () => {
      const { args } = await testFetch();
      expect(args).toMatchObject({
        index: 'tasky',
        body: {
          sort: [{ 'task.runAt': 'asc' }],
          query: { term: { type: 'task' } },
        },
      });
    });

    test('allows custom queries', async () => {
      const { args } = await testFetch({
        query: {
          term: { 'task.taskType': 'bar' },
        },
      });

      expect(args).toMatchObject({
        body: {
          query: {
            bool: {
              must: [{ term: { type: 'task' } }, { term: { 'task.taskType': 'bar' } }],
            },
          },
        },
      });
    });

    test('pushes error from call cluster to errors$', async () => {
      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      esClient.search.mockRejectedValue(new Error('Failure'));
      await expect(store.fetch()).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('claimAvailableTasks', () => {
    async function testClaimAvailableTasks({
      opts = {},
      hits = generateFakeTasks(1),
      claimingOpts,
    }: {
      opts: Partial<StoreOpts>;
      hits?: unknown[];
      claimingOpts: OwnershipClaimingOpts;
    }) {
      const versionConflicts = 2;
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.search.mockResolvedValue(asApiResponse({ hits: { hits } }));
      esClient.updateByQuery.mockResolvedValue(
        asApiResponse({
          total: hits.length + versionConflicts,
          updated: hits.length,
          version_conflicts: versionConflicts,
        })
      );

      const store = new TaskStore({
        esClient,
        maxAttempts: 2,
        definitions: taskDefinitions,
        serializer,
        savedObjectsRepository: savedObjectsClient,
        taskManagerId: '',
        index: '',
        ...opts,
      });

      const result = await store.claimAvailableTasks(claimingOpts);

      expect(esClient.updateByQuery.mock.calls[0][0]).toMatchObject({
        max_docs: claimingOpts.size,
      });
      expect(esClient.search.mock.calls[0][0]).toMatchObject({ body: { size: claimingOpts.size } });
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
        maxAttempts: 2,
        savedObjectsRepository: savedObjectsClient,
      });
      const { docs } = await store.claimAvailableTasks({
        claimOwnershipUntil: new Date(),
        size: 10,
      });
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
        opts: {
          maxAttempts,
          definitions,
        },
        claimingOpts: { claimOwnershipUntil: new Date(), size: 10 },
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
        opts: {
          taskManagerId,
          maxAttempts,
          definitions,
        },
        claimingOpts: {
          claimOwnershipUntil: new Date(),
          size: 10,
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
        source: `
  if (ctx._source.task.schedule != null || ctx._source.task.attempts < params.taskMaxAttempts[ctx._source.task.taskType] || params.claimTasksById.contains(ctx._id)) {
    ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
      .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
      .join(' ')}
  } else {
    ctx._source.task.status = "failed";
  }
  `,
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [
            'task:33c6977a-ed6d-43bd-98d9-3f827f7b7cd8',
            'task:a208b22c-14ec-4fb4-995f-d2ff7a3b03b8',
          ],
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
        opts: {
          taskManagerId,
        },
        claimingOpts: {
          claimOwnershipUntil,
          size: 10,
        },
      });
      expect(script).toMatchObject({
        source: `
  if (ctx._source.task.schedule != null || ctx._source.task.attempts < params.taskMaxAttempts[ctx._source.task.taskType] || params.claimTasksById.contains(ctx._id)) {
    ctx._source.task.status = "claiming"; ${Object.keys(fieldUpdates)
      .map((field) => `ctx._source.task.${field}=params.fieldUpdates.${field};`)
      .join(' ')}
  } else {
    ctx._source.task.status = "failed";
  }
  `,
        lang: 'painless',
        params: {
          fieldUpdates,
          claimTasksById: [],
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
        opts: {
          taskManagerId,
        },
        claimingOpts: {
          claimOwnershipUntil,
          size: 10,
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
        opts: {
          taskManagerId,
        },
        claimingOpts: {
          claimOwnershipUntil,
          size: 10,
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
        opts: {
          taskManagerId,
        },
        claimingOpts: {
          claimOwnershipUntil,
          size: 10,
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

    test('pushes error from saved objects client to errors$', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        definitions: taskDefinitions,
        maxAttempts: 2,
        savedObjectsRepository: savedObjectsClient,
      });

      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      esClient.updateByQuery.mockRejectedValue(new Error('Failure'));
      await expect(
        store.claimAvailableTasks({
          claimOwnershipUntil: new Date(),
          size: 10,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('update', () => {
    let store: TaskStore;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];

    beforeAll(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
    });

    test('refreshes the index, handles versioning', async () => {
      const task = {
        runAt: mockedDate,
        scheduledAt: mockedDate,
        startedAt: null,
        retryAt: null,
        id: 'task:324242',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        attempts: 3,
        status: 'idle' as TaskStatus,
        version: '123',
        ownerId: null,
      };

      savedObjectsClient.update.mockImplementation(
        async (type: string, id: string, attributes: SavedObjectAttributes) => {
          return {
            id,
            type,
            attributes,
            references: [],
            version: '123',
          };
        }
      );

      const result = await store.update(task);

      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        'task',
        task.id,
        {
          attempts: task.attempts,
          schedule: undefined,
          params: JSON.stringify(task.params),
          retryAt: null,
          runAt: task.runAt.toISOString(),
          scheduledAt: mockedDate.toISOString(),
          scope: undefined,
          startedAt: null,
          state: JSON.stringify(task.state),
          status: task.status,
          taskType: task.taskType,
          user: undefined,
          ownerId: null,
        },
        { version: '123', refresh: false }
      );

      expect(result).toEqual({
        ...task,
        schedule: undefined,
        retryAt: null,
        scope: undefined,
        startedAt: null,
        user: undefined,
        version: '123',
      });
    });

    test('pushes error from saved objects client to errors$', async () => {
      const task = {
        runAt: mockedDate,
        scheduledAt: mockedDate,
        startedAt: null,
        retryAt: null,
        id: 'task:324242',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        attempts: 3,
        status: 'idle' as TaskStatus,
        version: '123',
        ownerId: null,
      };

      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.update.mockRejectedValue(new Error('Failure'));
      await expect(store.update(task)).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('bulkUpdate', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
    });

    test('pushes error from saved objects client to errors$', async () => {
      const task = {
        runAt: mockedDate,
        scheduledAt: mockedDate,
        startedAt: null,
        retryAt: null,
        id: 'task:324242',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        attempts: 3,
        status: 'idle' as TaskStatus,
        version: '123',
        ownerId: null,
      };

      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.bulkUpdate.mockRejectedValue(new Error('Failure'));
      await expect(store.bulkUpdate([task])).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure"`
      );
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('remove', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
    });

    test('removes the task with the specified id', async () => {
      const id = randomId();
      const result = await store.remove(id);
      expect(result).toBeUndefined();
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('task', id);
    });

    test('pushes error from saved objects client to errors$', async () => {
      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.delete.mockRejectedValue(new Error('Failure'));
      await expect(store.remove(randomId())).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure"`
      );
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('get', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });
    });

    test('gets the task with the specified id', async () => {
      const task = {
        runAt: mockedDate,
        scheduledAt: mockedDate,
        startedAt: null,
        retryAt: null,
        id: randomId(),
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        attempts: 3,
        status: 'idle' as TaskStatus,
        version: '123',
        ownerId: null,
      };

      savedObjectsClient.get.mockImplementation(async (type: string, objectId: string) => ({
        id: objectId,
        type,
        attributes: {
          ..._.omit(task, 'id'),
          ..._.mapValues(_.pick(task, ['params', 'state']), (value) => JSON.stringify(value)),
        },
        references: [],
        version: '123',
      }));

      const result = await store.get(task.id);

      expect(result).toEqual(task);

      expect(savedObjectsClient.get).toHaveBeenCalledWith('task', task.id);
    });

    test('pushes error from saved objects client to errors$', async () => {
      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.get.mockRejectedValue(new Error('Failure'));
      await expect(store.get(randomId())).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('getLifecycle', () => {
    test('returns the task status if the task exists ', async () => {
      expect.assertions(4);
      return Promise.all(
        Object.values(TaskStatus).map(async (status) => {
          const task = {
            runAt: mockedDate,
            scheduledAt: mockedDate,
            startedAt: null,
            retryAt: null,
            id: randomId(),
            params: { hello: 'world' },
            state: { foo: 'bar' },
            taskType: 'report',
            attempts: 3,
            status: status as TaskStatus,
            version: '123',
            ownerId: null,
          };

          savedObjectsClient.get.mockImplementation(async (type: string, objectId: string) => ({
            id: objectId,
            type,
            attributes: {
              ..._.omit(task, 'id'),
              ..._.mapValues(_.pick(task, ['params', 'state']), (value) => JSON.stringify(value)),
            },
            references: [],
            version: '123',
          }));

          const store = new TaskStore({
            index: 'tasky',
            taskManagerId: '',
            serializer,
            esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
            maxAttempts: 2,
            definitions: taskDefinitions,
            savedObjectsRepository: savedObjectsClient,
          });

          expect(await store.getLifecycle(task.id)).toEqual(status);
        })
      );
    });

    test('returns NotFound status if the task doesnt exists ', async () => {
      savedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('type', 'id')
      );

      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });

      expect(await store.getLifecycle(randomId())).toEqual(TaskLifecycleResult.NotFound);
    });

    test('throws if an unknown error takes place ', async () => {
      savedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createBadRequestError()
      );

      const store = new TaskStore({
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        maxAttempts: 2,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
      });

      return expect(store.getLifecycle(randomId())).rejects.toThrow('Bad Request');
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
        maxAttempts: 2,
        definitions: taskDefinitions,
        serializer,
        savedObjectsRepository: savedObjectsClient,
        taskManagerId,
        index: '',
      });

      return { taskManagerId, runAt, store };
    }

    test('emits an event when a task is succesfully claimed by id', async () => {
      const { taskManagerId, runAt, store } = instantiateStoreWithMockedApiResponses();

      const promise = store.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, Option<ConcreteTaskInstance>>) =>
              event.id === 'claimed-by-id'
          ),
          take(1)
        )
        .toPromise();

      await store.claimAvailableTasks({
        claimTasksById: ['claimed-by-id'],
        claimOwnershipUntil: new Date(),
        size: 10,
      });

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
      const { taskManagerId, runAt, store } = instantiateStoreWithMockedApiResponses();

      const promise = store.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, Option<ConcreteTaskInstance>>) =>
              event.id === 'claimed-by-schedule'
          ),
          take(1)
        )
        .toPromise();

      await store.claimAvailableTasks({
        claimTasksById: ['claimed-by-id'],
        claimOwnershipUntil: new Date(),
        size: 10,
      });

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
      const { taskManagerId, runAt, store } = instantiateStoreWithMockedApiResponses();

      const promise = store.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, Option<ConcreteTaskInstance>>) =>
              event.id === 'already-running'
          ),
          take(1)
        )
        .toPromise();

      await store.claimAvailableTasks({
        claimTasksById: ['already-running'],
        claimOwnershipUntil: new Date(),
        size: 10,
      });

      const event = await promise;
      expect(event).toMatchObject(
        asTaskClaimEvent(
          'already-running',
          asErr(
            some({
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
            })
          )
        )
      );
    });

    test('emits an event when the store fails to find a task which was required by id', async () => {
      const { store } = instantiateStoreWithMockedApiResponses();

      const promise = store.events
        .pipe(
          filter(
            (event: TaskEvent<ConcreteTaskInstance, Option<ConcreteTaskInstance>>) =>
              event.id === 'unknown-task'
          ),
          take(1)
        )
        .toPromise();

      await store.claimAvailableTasks({
        claimTasksById: ['unknown-task'],
        claimOwnershipUntil: new Date(),
        size: 10,
      });

      const event = await promise;
      expect(event).toMatchObject(asTaskClaimEvent('unknown-task', asErr(none)));
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

const asApiResponse = <T>(body: T): RequestEvent<T> =>
  ({
    body,
  } as RequestEvent<T>);

const randomId = () => `id-${_.random(1, 20)}`;
