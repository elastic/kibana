/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ActionsConfig } from '../config';
import { ensureScheduled } from './ensure_scheduled';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';

describe('ensureScheduled', () => {
  const logger = loggingSystemMock.create().get();
  const taskManager = taskManagerMock.createStart();

  const config: ActionsConfig['cleanupFailedExecutionsTask'] = {
    enabled: true,
    cleanupInterval: schema.duration().validate('5m'),
    idleInterval: schema.duration().validate('1h'),
    pageSize: 100,
  };

  beforeEach(() => jest.resetAllMocks());

  it(`should call task manager's ensureScheduled function with proper params`, async () => {
    await ensureScheduled(taskManager, logger, config);
    expect(taskManager.ensureScheduled).toHaveBeenCalledTimes(1);
    expect(taskManager.ensureScheduled.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "Actions-cleanup_failed_action_executions",
          "params": Object {},
          "schedule": Object {
            "interval": "5m",
          },
          "state": Object {
            "runs": 0,
            "total_cleaned_up": 0,
          },
          "taskType": "cleanup_failed_action_executions",
        },
      ]
    `);
  });

  it('should log an error and not throw when ensureScheduled function throws', async () => {
    taskManager.ensureScheduled.mockRejectedValue(new Error('Fail'));
    await ensureScheduled(taskManager, logger, config);
    expect(logger.error).toHaveBeenCalledWith(
      'Error scheduling Actions-cleanup_failed_action_executions, received Fail'
    );
  });
});
