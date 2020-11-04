/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { taskManagerMock } from '../../../task_manager/server/mocks';
import { getHealthStatusStream } from '.';
import { TaskStatus } from '../../../task_manager/server';
import { HealthStatus } from '../types';

describe('getHealthStatusStream()', () => {
  const mockTaskManager = taskManagerMock.createStart();

  it('should return an object with the "unavailable" level and proper summary of "Alerting framework is unhealthy"', async () => {
    mockTaskManager.get.mockReturnValue(
      new Promise((_resolve, _reject) => {
        return {
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
            health_status: HealthStatus.Warning,
          },
          taskType: 'alerting:alerting_health_check',
          params: {
            alertId: '1',
          },
          ownerId: null,
        };
      })
    );
    getHealthStatusStream(mockTaskManager).subscribe(
      (val: { level: Readonly<unknown>; summary: string }) => {
        expect(val.level).toBe(false);
      }
    );
  });

  it('should return an object with the "available" level and proper summary of "Alerting framework is healthy"', async () => {
    mockTaskManager.get.mockReturnValue(
      new Promise((_resolve, _reject) => {
        return {
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
        };
      })
    );
    getHealthStatusStream(mockTaskManager).subscribe(
      (val: { level: Readonly<unknown>; summary: string }) => {
        expect(val.level).toBe(true);
      }
    );
  });
});
