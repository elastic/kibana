/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import sinon from 'sinon';
import { fillPool, FillPoolResult } from './fill_pool';
import { TaskPoolRunResult } from '../task_pool';
import { asOk, Result } from './result_type';
import { ConcreteTaskInstance, TaskStatus } from '../task';
import { TaskManagerRunner } from '../task_running/task_runner';
import { from, Observable } from 'rxjs';
import { ClaimOwnershipResult } from '../queries/task_claiming';

jest.mock('../task_running/task_runner');

describe('fillPool', () => {
  function mockFetchAvailableTasks(
    tasksToMock: number[][]
  ): () => Observable<Result<ClaimOwnershipResult, FillPoolResult>> {
    const claimCycles: ConcreteTaskInstance[][] = tasksToMock.map((ids) => mockTaskInstances(ids));
    return () =>
      from(
        claimCycles.map((tasks) =>
          asOk({
            stats: {
              tasksUpdated: tasks?.length ?? 0,
              tasksConflicted: 0,
              tasksClaimed: 0,
              tasksRejected: 0,
            },
            docs: tasks,
          })
        )
      );
  }

  const mockTaskInstances = (ids: number[]): ConcreteTaskInstance[] =>
    ids.map((id) => ({
      id: `${id}`,
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(0),
      scheduledAt: new Date(0),
      startedAt: new Date(0),
      retryAt: new Date(0),
      state: {
        startedAt: new Date(0),
      },
      taskType: '',
      params: {},
      ownerId: null,
    }));

  test('fills task pool with all claimed tasks until fetchAvailableTasks stream closes', async () => {
    const tasks = [
      [1, 2, 3],
      [4, 5],
    ];
    const fetchAvailableTasks = mockFetchAvailableTasks(tasks);
    const run = sinon.spy(async () => TaskPoolRunResult.RunningAllClaimedTasks);
    const converter = _.identity;

    await fillPool(fetchAvailableTasks, converter, run);

    expect(_.flattenDeep(run.args)).toEqual(mockTaskInstances([1, 2, 3, 4, 5]));
  });

  test('calls the converter on the records prior to running', async () => {
    const tasks = [
      [1, 2, 3],
      [4, 5],
    ];
    const fetchAvailableTasks = mockFetchAvailableTasks(tasks);
    const run = sinon.spy(async () => TaskPoolRunResult.RanOutOfCapacity);
    const converter = (instance: ConcreteTaskInstance) =>
      instance.id as unknown as TaskManagerRunner;

    await fillPool(fetchAvailableTasks, converter, run);

    expect(_.flattenDeep(run.args)).toEqual(['1', '2', '3', '4', '5']);
  });

  describe('error handling', () => {
    test('throws exception from fetchAvailableTasks', async () => {
      const run = sinon.spy(async () => TaskPoolRunResult.RanOutOfCapacity);
      const converter = (instance: ConcreteTaskInstance) =>
        instance.id as unknown as TaskManagerRunner;

      try {
        const fetchAvailableTasks = () =>
          new Observable<Result<ClaimOwnershipResult, FillPoolResult>>((obs) =>
            obs.error('fetch is not working')
          );

        await fillPool(fetchAvailableTasks, converter, run);
      } catch (err) {
        expect(err.toString()).toBe('fetch is not working');
        expect(run.called).toBe(false);
      }
    });

    test('throws exception from run', async () => {
      const run = sinon.spy(() => Promise.reject('run is not working'));
      const converter = (instance: ConcreteTaskInstance) =>
        instance.id as unknown as TaskManagerRunner;

      try {
        const tasks = [
          [1, 2, 3],
          [4, 5],
        ];
        const fetchAvailableTasks = mockFetchAvailableTasks(tasks);

        await fillPool(fetchAvailableTasks, converter, run);
      } catch (err) {
        expect(err.toString()).toBe('run is not working');
      }
    });

    test('throws exception from converter', async () => {
      try {
        const tasks = [
          [1, 2, 3],
          [4, 5],
        ];
        const fetchAvailableTasks = mockFetchAvailableTasks(tasks);
        const run = sinon.spy(async () => TaskPoolRunResult.RanOutOfCapacity);
        const converter = (instance: ConcreteTaskInstance) => {
          throw new Error(`can not convert ${instance.id}`);
        };

        await fillPool(fetchAvailableTasks, converter, run);
      } catch (err) {
        expect(err.toString()).toBe('Error: can not convert 1');
      }
    });
  });
});
