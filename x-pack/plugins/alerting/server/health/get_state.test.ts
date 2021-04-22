/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceStatusLevels } from '../../../../../src/core/server';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import {
  getHealthStatusStream,
  getHealthServiceStatusWithRetryAndErrorHandling,
  MAX_RETRY_ATTEMPTS,
} from './get_state';
import { ConcreteTaskInstance, TaskStatus } from '../../../task_manager/server';
import { HealthStatus } from '../types';

const tick = () => new Promise((resolve) => setImmediate(resolve));

const getHealthCheckTask = (overrides = {}): ConcreteTaskInstance => ({
  id: 'test',
  attempts: 0,
  status: TaskStatus.Running,
  version: '123',
  runAt: new Date(),
  scheduledAt: new Date(),
  startedAt: new Date(),
  retryAt: new Date(Date.now() + 5 * 60 * 1000),
  state: {
    runs: 1,
    health_status: HealthStatus.OK,
  },
  taskType: 'alerting:alerting_health_check',
  params: {
    alertId: '1',
  },
  ownerId: null,
  ...overrides,
});

describe('getHealthServiceStatusWithRetryAndErrorHandling', () => {
  beforeEach(() => jest.useFakeTimers());

  it('should get status at each interval', async () => {
    const mockTaskManager = taskManagerMock.createStart();
    mockTaskManager.get.mockResolvedValue(getHealthCheckTask());
    const pollInterval = 100;
    const halfInterval = Math.floor(pollInterval / 2);

    getHealthStatusStream(mockTaskManager, pollInterval).subscribe();

    // shouldn't fire before poll interval passes
    // should fire once each poll interval
    jest.advanceTimersByTime(halfInterval);
    expect(mockTaskManager.get).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(halfInterval);
    expect(mockTaskManager.get).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(pollInterval);
    expect(mockTaskManager.get).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(pollInterval);
    expect(mockTaskManager.get).toHaveBeenCalledTimes(3);
  });

  it('should retry on error', async () => {
    const mockTaskManager = taskManagerMock.createStart();
    mockTaskManager.get.mockRejectedValue(new Error('Failure'));
    const retryDelay = 10;
    const pollInterval = 100;
    const halfInterval = Math.floor(pollInterval / 2);

    getHealthStatusStream(mockTaskManager, pollInterval, retryDelay).subscribe();

    jest.advanceTimersByTime(halfInterval);
    expect(mockTaskManager.get).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(halfInterval);
    expect(mockTaskManager.get).toHaveBeenCalledTimes(1);

    // Retry on failure
    let numTimesCalled = 1;
    for (let i = 0; i < MAX_RETRY_ATTEMPTS; i++) {
      await tick();
      jest.advanceTimersByTime(retryDelay);
      expect(mockTaskManager.get).toHaveBeenCalledTimes(numTimesCalled++ + 1);
    }

    // Once we've exceeded max retries, should not try again
    await tick();
    jest.advanceTimersByTime(retryDelay);
    expect(mockTaskManager.get).toHaveBeenCalledTimes(numTimesCalled);

    // Once another poll interval passes, should call fn again
    await tick();
    jest.advanceTimersByTime(pollInterval - MAX_RETRY_ATTEMPTS * retryDelay);
    expect(mockTaskManager.get).toHaveBeenCalledTimes(numTimesCalled + 1);
  });

  it('should return healthy status when health status is "ok"', async () => {
    const mockTaskManager = taskManagerMock.createStart();
    mockTaskManager.get.mockResolvedValue(getHealthCheckTask());

    const status = await getHealthServiceStatusWithRetryAndErrorHandling(
      mockTaskManager
    ).toPromise();

    expect(status.level).toEqual(ServiceStatusLevels.available);
    expect(status.summary).toEqual('Alerting framework is available');
  });

  it('should return degraded status when health status is "warn"', async () => {
    const mockTaskManager = taskManagerMock.createStart();
    mockTaskManager.get.mockResolvedValue(
      getHealthCheckTask({
        state: {
          runs: 1,
          health_status: HealthStatus.Warning,
        },
      })
    );

    const status = await getHealthServiceStatusWithRetryAndErrorHandling(
      mockTaskManager
    ).toPromise();

    expect(status.level).toEqual(ServiceStatusLevels.degraded);
    expect(status.summary).toEqual('Alerting framework is degraded');
  });

  it('should return unavailable status when health status is "error"', async () => {
    const mockTaskManager = taskManagerMock.createStart();
    mockTaskManager.get.mockResolvedValue(
      getHealthCheckTask({
        state: {
          runs: 1,
          health_status: HealthStatus.Error,
        },
      })
    );

    const status = await getHealthServiceStatusWithRetryAndErrorHandling(
      mockTaskManager
    ).toPromise();

    expect(status.level).toEqual(ServiceStatusLevels.unavailable);
    expect(status.summary).toEqual('Alerting framework is unavailable');
    expect(status.meta).toBeUndefined();
  });

  it('should retry on error and return healthy status if retry succeeds', async () => {
    const retryDelay = 10;
    const mockTaskManager = taskManagerMock.createStart();
    mockTaskManager.get
      .mockRejectedValueOnce(new Error('Failure'))
      .mockResolvedValue(getHealthCheckTask());

    getHealthServiceStatusWithRetryAndErrorHandling(mockTaskManager, retryDelay).subscribe(
      (status) => {
        expect(status.level).toEqual(ServiceStatusLevels.available);
        expect(status.summary).toEqual('Alerting framework is available');
      }
    );

    await tick();
    jest.advanceTimersByTime(retryDelay * 2);
  });

  it('should retry on error and return unavailable status if retry fails', async () => {
    const retryDelay = 10;
    const err = new Error('Failure');
    const mockTaskManager = taskManagerMock.createStart();
    mockTaskManager.get.mockRejectedValue(err);

    getHealthServiceStatusWithRetryAndErrorHandling(mockTaskManager, retryDelay).subscribe(
      (status) => {
        expect(status.level).toEqual(ServiceStatusLevels.unavailable);
        expect(status.summary).toEqual('Alerting framework is unavailable');
        expect(status.meta).toEqual({ error: err });
      }
    );

    for (let i = 0; i < MAX_RETRY_ATTEMPTS + 1; i++) {
      await tick();
      jest.advanceTimersByTime(retryDelay);
    }
    expect(mockTaskManager.get).toHaveBeenCalledTimes(MAX_RETRY_ATTEMPTS + 1);
  });
});
