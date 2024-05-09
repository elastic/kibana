/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Client } from '@elastic/elasticsearch';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import _ from 'lodash';
import { first } from 'rxjs';

import {
  TaskInstance,
  TaskStatus,
  TaskLifecycleResult,
  SerializedConcreteTaskInstance,
} from './task';
import { elasticsearchServiceMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { TaskStore, SearchOpts, AggregationOpts } from './task_store';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { SavedObjectAttributes, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { TaskTypeDictionary } from './task_type_dictionary';
import { mockLogger } from './test_utils';
import { AdHocTaskCounter } from './lib/adhoc_task_counter';
import { asErr } from './lib/result_type';
import { UpdateByQueryResponse } from '@elastic/elasticsearch/lib/api/types';

const mockGetValidatedTaskInstanceFromReading = jest.fn();
const mockGetValidatedTaskInstanceForUpdating = jest.fn();
jest.mock('./task_validator', () => {
  return {
    TaskValidator: jest.fn().mockImplementation(() => {
      return {
        getValidatedTaskInstanceFromReading: mockGetValidatedTaskInstanceFromReading,
        getValidatedTaskInstanceForUpdating: mockGetValidatedTaskInstanceForUpdating,
      };
    }),
  };
});

const savedObjectsClient = savedObjectsRepositoryMock.create();
const serializer = savedObjectsServiceMock.createSerializer();
const adHocTaskCounter = new AdHocTaskCounter();

const randomId = () => `id-${_.random(1, 20)}`;

beforeEach(() => {
  jest.resetAllMocks();
  jest.requireMock('./task_validator').TaskValidator.mockImplementation(() => {
    return {
      getValidatedTaskInstanceFromReading: mockGetValidatedTaskInstanceFromReading,
      getValidatedTaskInstanceForUpdating: mockGetValidatedTaskInstanceForUpdating,
    };
  });
  mockGetValidatedTaskInstanceFromReading.mockImplementation((task) => task);
  mockGetValidatedTaskInstanceForUpdating.mockImplementation((task) => task);
});

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
    stateSchemaByVersion: {
      1: {
        schema: schema.object({
          foo: schema.string(),
        }),
        up: (doc) => doc,
      },
    },
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
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });

    afterEach(() => {
      adHocTaskCounter.reset();
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
        traceparent: 'apmTraceparent',
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
          traceparent: 'apmTraceparent',
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
        traceparent: 'apmTraceparent',
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

    test('increments adHocTaskCounter', async () => {
      const task: TaskInstance = {
        id: 'id',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };

      await testSchedule(task);
      expect(adHocTaskCounter.count).toEqual(1);
    });

    test('does not increment adHocTaskCounter if the task is recurring', async () => {
      const task: TaskInstance = {
        id: 'id',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        schedule: { interval: '1m' },
      };

      await testSchedule(task);
      expect(adHocTaskCounter.count).toEqual(0);
    });
  });

  describe('fetch', () => {
    let store: TaskStore;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];
    let childEsClient: ReturnType<
      typeof elasticsearchServiceMock.createClusterClient
    >['asInternalUser'];

    beforeAll(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      childEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.child.mockReturnValue(childEsClient as unknown as Client);
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });

    async function testFetch(opts?: SearchOpts, hits: Array<estypes.SearchHit<unknown>> = []) {
      childEsClient.search.mockResponse({
        hits: { hits, total: hits.length },
      } as estypes.SearchResponse);

      const result = await store.fetch(opts);

      expect(childEsClient.search).toHaveBeenCalledTimes(1);

      return {
        result,
        args: childEsClient.search.mock.calls[0][0],
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
      childEsClient.search.mockRejectedValue(new Error('Failure'));
      await expect(store.fetch()).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('aggregate', () => {
    let store: TaskStore;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];

    beforeAll(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });

    async function testAggregate(
      opts: AggregationOpts,
      hits: Array<estypes.SearchHit<unknown>> = []
    ) {
      esClient.search.mockResponse({
        hits: { hits, total: hits.length },
        aggregations: {},
      } as estypes.SearchResponse);

      const result = await store.aggregate(opts);

      expect(esClient.search).toHaveBeenCalledTimes(1);

      return {
        result,
        args: esClient.search.mock.calls[0][0],
      };
    }

    test('empty call filters by type, sets size to 0, passes aggregation to esClient', async () => {
      const { args } = await testAggregate({
        aggs: { testAgg: { terms: { field: 'task.taskType' } } },
      });
      expect(args).toMatchObject({
        index: 'tasky',
        body: {
          size: 0,
          query: {
            bool: { filter: [{ term: { type: 'task' } }, { term: { 'task.enabled': true } }] },
          },
          aggs: { testAgg: { terms: { field: 'task.taskType' } } },
        },
      });
    });

    test('allows custom queries', async () => {
      const { args } = await testAggregate({
        aggs: { testAgg: { terms: { field: 'task.taskType' } } },
        query: {
          term: { 'task.taskType': 'bar' },
        },
      });

      expect(args).toMatchObject({
        body: {
          size: 0,
          query: {
            bool: {
              must: [
                {
                  bool: {
                    filter: [{ term: { type: 'task' } }, { term: { 'task.enabled': true } }],
                  },
                },
                { term: { 'task.taskType': 'bar' } },
              ],
            },
          },
          aggs: { testAgg: { terms: { field: 'task.taskType' } } },
        },
      });
    });

    test('allows runtime mappings', async () => {
      const { args } = await testAggregate({
        aggs: { testAgg: { terms: { field: 'task.taskType' } } },
        runtime_mappings: { testMapping: { type: 'long', script: { source: `` } } },
      });

      expect(args).toMatchObject({
        body: {
          size: 0,
          query: {
            bool: { filter: [{ term: { type: 'task' } }, { term: { 'task.enabled': true } }] },
          },
          aggs: { testAgg: { terms: { field: 'task.taskType' } } },
          runtime_mappings: { testMapping: { type: 'long', script: { source: `` } } },
        },
      });
    });

    test('throws error when esClient.search throws error', async () => {
      esClient.search.mockRejectedValue(new Error('Failure'));
      await expect(store.aggregate({ aggs: {} })).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure"`
      );
    });
  });

  describe('update', () => {
    let store: TaskStore;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];

    beforeAll(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
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
        traceparent: 'myTraceparent',
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

      const result = await store.update(task, { validate: true });

      expect(mockGetValidatedTaskInstanceForUpdating).toHaveBeenCalledTimes(1);
      expect(mockGetValidatedTaskInstanceFromReading).toHaveBeenCalledTimes(1);
      expect(mockGetValidatedTaskInstanceForUpdating).toHaveBeenCalledWith(task, {
        validate: true,
      });
      expect(mockGetValidatedTaskInstanceFromReading).toHaveBeenCalledWith(task, {
        validate: true,
      });
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
          traceparent: 'myTraceparent',
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

    test(`doesn't go through validation process to inject stateVersion when validate:false`, async () => {
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
        traceparent: 'myTraceparent',
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

      await store.update(task, { validate: false });

      expect(mockGetValidatedTaskInstanceForUpdating).toHaveBeenCalledWith(task, {
        validate: false,
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
        traceparent: '',
      };

      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.update.mockRejectedValue(new Error('Failure'));
      await expect(
        store.update(task, { validate: true })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('bulkUpdate', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });

    test(`doesn't validate whenever validate:false is passed-in`, async () => {
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
        traceparent: '',
      };

      savedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: '324242',
            type: 'task',
            attributes: {
              ...task,
              state: '{"foo":"bar"}',
              params: '{"hello":"world"}',
            },
            references: [],
            version: '123',
          },
        ],
      });

      await store.bulkUpdate([task], { validate: false });

      expect(mockGetValidatedTaskInstanceForUpdating).toHaveBeenCalledWith(task, {
        validate: false,
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
        traceparent: '',
      };

      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.bulkUpdate.mockRejectedValue(new Error('Failure'));
      await expect(
        store.bulkUpdate([task], { validate: true })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failure"`);
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('remove', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });

    test('removes the task with the specified id', async () => {
      const id = randomId();
      const result = await store.remove(id);
      expect(result).toBeUndefined();
      expect(savedObjectsClient.delete).toHaveBeenCalledWith('task', id, { refresh: false });
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

  describe('bulkRemove', () => {
    let store: TaskStore;

    const tasksIdsToDelete = [randomId(), randomId()];

    beforeAll(() => {
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });

    test('removes the tasks with the specified ids', async () => {
      const result = await store.bulkRemove(tasksIdsToDelete);
      expect(result).toBeUndefined();
      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith(
        [
          { type: 'task', id: tasksIdsToDelete[0] },
          { type: 'task', id: tasksIdsToDelete[1] },
        ],
        { refresh: false }
      );
    });

    test('pushes error from saved objects client to errors$', async () => {
      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.bulkDelete.mockRejectedValue(new Error('Failure'));
      await expect(store.bulkRemove(tasksIdsToDelete)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure"`
      );
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('get', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
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
        stateVersion: 1,
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

  describe('bulkGet', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });

    test('gets a task specified by id', async () => {
      savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [] });
      await store.bulkGet(['1', '2']);
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith([
        { type: 'task', id: '1' },
        { type: 'task', id: '2' },
      ]);
    });

    test('returns error when task not found', async () => {
      savedObjectsClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            type: 'task',
            id: '1',
            attributes: {},
            references: [],
            error: {
              error: 'Oh no',
              message: 'Oh no',
              statusCode: 404,
            },
          },
        ],
      });
      const result = await store.bulkGet(['1']);
      expect(result).toEqual([
        asErr({
          type: 'task',
          id: '1',
          error: {
            error: 'Oh no',
            message: 'Oh no',
            statusCode: 404,
          },
        }),
      ]);
    });

    test('pushes error from saved objects client to errors$', async () => {
      const firstErrorPromise = store.errors$.pipe(first()).toPromise();
      savedObjectsClient.bulkGet.mockRejectedValue(new Error('Failure'));
      await expect(store.bulkGet([randomId()])).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure"`
      );
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });
  });

  describe('getLifecycle', () => {
    test('returns the task status if the task exists ', async () => {
      expect.assertions(6);
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
            stateVersion: 1,
            taskType: 'report',
            attempts: 3,
            status: status as TaskStatus,
            version: '123',
            ownerId: null,
            traceparent: 'myTraceparent',
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
            logger: mockLogger(),
            index: 'tasky',
            taskManagerId: '',
            serializer,
            esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
            definitions: taskDefinitions,
            savedObjectsRepository: savedObjectsClient,
            adHocTaskCounter,
            allowReadingInvalidState: false,
            requestTimeouts: {
              update_by_query: 1000,
            },
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
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });

      expect(await store.getLifecycle(randomId())).toEqual(TaskLifecycleResult.NotFound);
    });

    test('throws if an unknown error takes place ', async () => {
      savedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createBadRequestError()
      );

      const store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });

      return expect(store.getLifecycle(randomId())).rejects.toThrow('Bad Request');
    });
  });

  describe('bulkSchedule', () => {
    let store: TaskStore;

    beforeAll(() => {
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });

    afterEach(() => {
      adHocTaskCounter.reset();
    });

    async function testBulkSchedule(task: unknown) {
      savedObjectsClient.bulkCreate.mockImplementation(async () => ({
        saved_objects: [
          {
            id: 'testid',
            type: 'test',
            attributes: {
              attempts: 0,
              params: '{"hello":"world"}',
              retryAt: null,
              runAt: '2019-02-12T21:01:22.479Z',
              scheduledAt: '2019-02-12T21:01:22.479Z',
              startedAt: null,
              state: '{"foo":"bar"}',
              stateVersion: 1,
              status: 'idle',
              taskType: 'report',
              traceparent: 'apmTraceparent',
            },
            references: [],
            version: '123',
          },
        ],
      }));
      const result = await store.bulkSchedule(task as TaskInstance[]);

      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);

      return result;
    }

    test('serializes the params and state', async () => {
      const task = {
        id: 'id',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        traceparent: 'apmTraceparent',
      };
      const result = await testBulkSchedule([task]);

      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          {
            id: 'id',
            type: 'task',
            attributes: {
              attempts: 0,
              params: '{"hello":"world"}',
              retryAt: null,
              runAt: '2019-02-12T21:01:22.479Z',
              scheduledAt: '2019-02-12T21:01:22.479Z',
              startedAt: null,
              state: '{"foo":"bar"}',
              status: 'idle',
              taskType: 'report',
              traceparent: 'apmTraceparent',
            },
          },
        ],
        { refresh: false }
      );

      expect(result).toEqual([
        {
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
          stateVersion: 1,
          status: 'idle',
          taskType: 'report',
          user: undefined,
          version: '123',
          traceparent: 'apmTraceparent',
        },
      ]);
    });

    test('returns a concrete task instance', async () => {
      const task = {
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };
      const result = await testBulkSchedule([task]);

      expect(result).toMatchObject([
        {
          ...task,
          id: 'testid',
        },
      ]);
    });

    test('errors if the task type is unknown', async () => {
      await expect(testBulkSchedule([{ taskType: 'nope', params: {}, state: {} }])).rejects.toThrow(
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
      savedObjectsClient.bulkCreate.mockRejectedValue(new Error('Failure'));
      await expect(store.bulkSchedule([task])).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failure"`
      );
      expect(await firstErrorPromise).toMatchInlineSnapshot(`[Error: Failure]`);
    });

    test('increments adHocTaskCounter', async () => {
      const task: TaskInstance = {
        id: 'id',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };

      const result = await testBulkSchedule([task]);
      expect(adHocTaskCounter.count).toEqual(result.length);
    });

    test('does not increment adHocTaskCounter if the task is recurring', async () => {
      const task: TaskInstance = {
        id: 'id',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        schedule: { interval: '1m' },
      };

      await testBulkSchedule([task]);
      expect(adHocTaskCounter.count).toEqual(0);
    });
  });

  describe('TaskValidator', () => {
    test(`should pass allowReadingInvalidState:false accordingly`, () => {
      const logger = mockLogger();

      new TaskStore({
        logger,
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });

      expect(jest.requireMock('./task_validator').TaskValidator).toHaveBeenCalledWith({
        logger,
        definitions: taskDefinitions,
        allowReadingInvalidState: false,
      });
    });

    test(`should pass allowReadingInvalidState:true accordingly`, () => {
      const logger = mockLogger();

      new TaskStore({
        logger,
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient: elasticsearchServiceMock.createClusterClient().asInternalUser,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: true,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });

      expect(jest.requireMock('./task_validator').TaskValidator).toHaveBeenCalledWith({
        logger,
        definitions: taskDefinitions,
        allowReadingInvalidState: true,
      });
    });
  });

  describe('updateByQuery', () => {
    let store: TaskStore;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];
    let childEsClient: ReturnType<
      typeof elasticsearchServiceMock.createClusterClient
    >['asInternalUser'];

    beforeAll(() => {
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      childEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      esClient.child.mockReturnValue(childEsClient as unknown as Client);
      store = new TaskStore({
        logger: mockLogger(),
        index: 'tasky',
        taskManagerId: '',
        serializer,
        esClient,
        definitions: taskDefinitions,
        savedObjectsRepository: savedObjectsClient,
        adHocTaskCounter,
        allowReadingInvalidState: false,
        requestTimeouts: {
          update_by_query: 1000,
        },
      });
    });
    test('should pass requestTimeout', async () => {
      childEsClient.updateByQuery.mockResponse({
        hits: { hits: [], total: 0, updated: 100, version_conflicts: 0 },
      } as UpdateByQueryResponse);
      await store.updateByQuery({ script: '' }, { max_docs: 10 });
      expect(childEsClient.updateByQuery).toHaveBeenCalledWith(expect.any(Object), {
        requestTimeout: 1000,
      });
    });
  });
});
