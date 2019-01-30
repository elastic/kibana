/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { TaskInstance, TaskStatus } from './task';
import { FetchOpts, TaskStore } from './task_store';

describe('TaskStore', () => {
  describe('init', () => {
    test('creates the task manager index', async () => {
      const callCluster = sinon.spy();
      const store = new TaskStore({
        callCluster,
        index: 'tasky',
        maxAttempts: 2,
        supportedTypes: ['a', 'b', 'c'],
      });

      await store.init();

      sinon.assert.calledOnce(callCluster);

      sinon.assert.calledWithMatch(callCluster, 'indices.putTemplate', {
        body: {
          index_patterns: ['tasky'],
          settings: {
            number_of_shards: 1,
            auto_expand_replicas: '0-1',
          },
        },
        name: 'tasky',
      });
    });
  });

  describe('schedule', () => {
    async function testSchedule(task: TaskInstance) {
      const callCluster = sinon.spy(() =>
        Promise.resolve({
          _id: 'testid',
          _version: 3344,
        })
      );
      const store = new TaskStore({
        callCluster,
        index: 'tasky',
        maxAttempts: 2,
        supportedTypes: ['report', 'dernstraight', 'yawn'],
      });
      const result = await store.schedule(task);

      sinon.assert.calledTwice(callCluster);

      return { result, callCluster, arg: callCluster.args[1][1] };
    }

    test('serializes the params and state', async () => {
      const task = {
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };
      const { callCluster, arg } = await testSchedule(task);

      sinon.assert.calledWith(callCluster, 'index');

      expect(arg).toMatchObject({
        index: 'tasky',
        body: {
          task: {
            params: JSON.stringify(task.params),
            state: JSON.stringify(task.state),
          },
        },
      });
    });

    test('retiurns a concrete task instance', async () => {
      const task = {
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
      };
      const { result } = await testSchedule(task);

      expect(result).toMatchObject({
        ...task,
        version: 3344,
        id: 'testid',
      });
    });

    test('sets runAt to now if not specified', async () => {
      const now = Date.now();
      const { arg } = await testSchedule({ taskType: 'dernstraight', params: {}, state: {} });
      expect(arg.body.task.runAt.getTime()).toBeGreaterThanOrEqual(now);
    });

    test('ensures params and state are not null', async () => {
      const { arg } = await testSchedule({ taskType: 'yawn' } as any);
      expect(arg.body.task.params).toEqual('{}');
      expect(arg.body.task.state).toEqual('{}');
    });

    test('errors if the task type is unknown', async () => {
      await expect(testSchedule({ taskType: 'nope', params: {}, state: {} })).rejects.toThrow(
        /Unsupported task type "nope"/i
      );
    });
  });

  describe('fetch', () => {
    async function testFetch(opts?: FetchOpts, hits: any[] = []) {
      const callCluster = sinon.spy(async () => ({ hits: { hits } }));
      const store = new TaskStore({
        callCluster,
        index: 'tasky',
        maxAttempts: 2,
        supportedTypes: ['a', 'b', 'c'],
      });

      const result = await store.fetch(opts);

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'search');

      return {
        result,
        args: callCluster.args[0][1],
      };
    }

    test('empty call filters by type, sorts by runAt and id', async () => {
      const { args } = await testFetch();
      expect(args).toMatchObject({
        index: 'tasky',
        body: {
          sort: [{ 'task.runAt': 'asc' }, { _id: 'desc' }],
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

    test('sorts by id if custom sort does not have an id sort in it', async () => {
      const { args } = await testFetch({
        sort: [{ 'task.taskType': 'desc' }],
      });

      expect(args).toMatchObject({
        body: {
          sort: [{ 'task.taskType': 'desc' }, { _id: 'desc' }],
        },
      });
    });

    test('allows custom sort by id', async () => {
      const { args } = await testFetch({
        sort: [{ _id: 'asc' }],
      });

      expect(args).toMatchObject({
        body: {
          sort: [{ _id: 'asc' }],
        },
      });
    });

    test('allows specifying pagination', async () => {
      const now = new Date();
      const searchAfter = [now, '143243sdafa32'];
      const { args } = await testFetch({
        searchAfter,
      });

      expect(args).toMatchObject({
        body: {
          search_after: searchAfter,
        },
      });
    });

    test('returns paginated tasks', async () => {
      const runAt = new Date();
      const { result } = await testFetch(undefined, [
        {
          _id: 'aaa',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'foo',
              interval: undefined,
              attempts: 0,
              status: 'idle',
              params: '{ "hello": "world" }',
              state: '{ "baby": "Henhen" }',
              user: 'jimbo',
              scope: ['reporting'],
            },
          },
          sort: ['a', 1],
        },
        {
          _id: 'bbb',
          _source: {
            type: 'task',
            task: {
              runAt,
              taskType: 'bar',
              interval: '5m',
              attempts: 2,
              status: 'running',
              params: '{ "shazm": 1 }',
              state: '{ "henry": "The 8th" }',
              user: 'dabo',
              scope: ['reporting', 'ceo'],
            },
          },
          sort: ['b', 2],
        },
      ]);

      expect(result).toEqual({
        docs: [
          {
            attempts: 0,
            id: 'aaa',
            interval: undefined,
            params: { hello: 'world' },
            runAt,
            scope: ['reporting'],
            state: { baby: 'Henhen' },
            status: 'idle',
            taskType: 'foo',
            user: 'jimbo',
            version: undefined,
          },
          {
            attempts: 2,
            id: 'bbb',
            interval: '5m',
            params: { shazm: 1 },
            runAt,
            scope: ['reporting', 'ceo'],
            state: { henry: 'The 8th' },
            status: 'running',
            taskType: 'bar',
            user: 'dabo',
            version: undefined,
          },
        ],
        searchAfter: ['b', 2],
      });
    });
  });

  describe('fetchAvailableTasks', () => {
    async function testFetchAvailableTasks({ opts = {}, hits = [] }: any = {}) {
      const callCluster = sinon.spy(async () => ({ hits: { hits } }));
      const store = new TaskStore({
        callCluster,
        supportedTypes: ['a', 'b', 'c'],
        index: 'tasky',
        maxAttempts: 2,
        ...opts,
      });

      const result = await store.fetchAvailableTasks();

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'search');

      return {
        result,
        args: callCluster.args[0][1],
      };
    }

    test('it returns normally with no tasks when the index does not exist.', async () => {
      const callCluster = sinon.spy(async () => ({ hits: { hits: [] } }));
      const store = new TaskStore({
        callCluster,
        supportedTypes: ['a', 'b', 'c'],
        index: 'tasky',
        maxAttempts: 2,
      });

      const result = await store.fetchAvailableTasks();

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWithMatch(callCluster, 'search', { ignoreUnavailable: true });

      expect(result.length).toBe(0);
    });

    test('it filters tasks by supported types, maxAttempts, and runAt', async () => {
      const maxAttempts = _.random(2, 43);
      const index = `index_${_.random(1, 234)}`;
      const { args } = await testFetchAvailableTasks({
        opts: {
          index,
          maxAttempts,
          supportedTypes: ['foo', 'bar'],
        },
      });
      expect(args).toMatchObject({
        body: {
          query: {
            bool: {
              must: [
                { term: { type: 'task' } },
                {
                  bool: {
                    must: [
                      { terms: { 'task.taskType': ['foo', 'bar'] } },
                      { range: { 'task.attempts': { lte: maxAttempts } } },
                      { range: { 'task.runAt': { lte: 'now' } } },
                    ],
                  },
                },
              ],
            },
          },
          size: 10,
          sort: { 'task.runAt': { order: 'asc' } },
          version: true,
        },
        index,
      });
    });

    test('it returns task objects', async () => {
      const runAt = new Date();
      const { result } = await testFetchAvailableTasks({
        hits: [
          {
            _id: 'aaa',
            _source: {
              type: 'task',
              task: {
                runAt,
                taskType: 'foo',
                interval: undefined,
                attempts: 0,
                status: 'idle',
                params: '{ "hello": "world" }',
                state: '{ "baby": "Henhen" }',
                user: 'jimbo',
                scope: ['reporting'],
              },
            },
            sort: ['a', 1],
          },
          {
            _id: 'bbb',
            _source: {
              type: 'task',
              task: {
                runAt,
                taskType: 'bar',
                interval: '5m',
                attempts: 2,
                status: 'running',
                params: '{ "shazm": 1 }',
                state: '{ "henry": "The 8th" }',
                user: 'dabo',
                scope: ['reporting', 'ceo'],
              },
            },
            sort: ['b', 2],
          },
        ],
      });
      expect(result).toMatchObject([
        {
          attempts: 0,
          id: 'aaa',
          interval: undefined,
          params: { hello: 'world' },
          runAt,
          scope: ['reporting'],
          state: { baby: 'Henhen' },
          status: 'idle',
          taskType: 'foo',
          user: 'jimbo',
          version: undefined,
        },
        {
          attempts: 2,
          id: 'bbb',
          interval: '5m',
          params: { shazm: 1 },
          runAt,
          scope: ['reporting', 'ceo'],
          state: { henry: 'The 8th' },
          status: 'running',
          taskType: 'bar',
          user: 'dabo',
          version: undefined,
        },
      ]);
    });
  });

  describe('update', () => {
    test('refreshes the index, handles versioning', async () => {
      const runAt = new Date();
      const task = {
        runAt,
        id: 'task:324242',
        params: { hello: 'world' },
        state: { foo: 'bar' },
        taskType: 'report',
        version: 2,
        attempts: 3,
        status: 'idle' as TaskStatus,
      };

      const callCluster = sinon.spy(async () => ({ _version: task.version + 1 }));
      const store = new TaskStore({
        callCluster,
        index: 'tasky',
        maxAttempts: 2,
        supportedTypes: ['a', 'b', 'c'],
      });

      const result = await store.update(task);

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'update');

      expect(callCluster.args[0][1]).toMatchObject({
        id: task.id,
        index: 'tasky',
        version: 2,
        refresh: true,
        body: {
          doc: {
            task: {
              ...['id', 'version'].reduce((acc, prop) => _.omit(acc, prop), task),
              params: JSON.stringify(task.params),
              state: JSON.stringify(task.state),
            },
          },
        },
      });

      expect(result).toEqual({ ...task, version: 3 });
    });
  });

  describe('remove', () => {
    test('removes the task with the specified id', async () => {
      const id = `id-${_.random(1, 20)}`;
      const callCluster = sinon.spy(() =>
        Promise.resolve({
          _index: 'myindex',
          _id: id,
          _version: 32,
          result: 'deleted',
        })
      );
      const store = new TaskStore({
        callCluster,
        index: 'myindex',
        maxAttempts: 2,
        supportedTypes: ['a'],
      });
      const result = await store.remove(id);

      sinon.assert.calledOnce(callCluster);
      sinon.assert.calledWith(callCluster, 'delete');

      expect(result).toEqual({
        id,
        index: 'myindex',
        version: 32,
        result: 'deleted',
      });

      expect(callCluster.args[0][1]).toMatchObject({
        id,
        index: 'myindex',
        refresh: true,
      });
    });
  });
});
