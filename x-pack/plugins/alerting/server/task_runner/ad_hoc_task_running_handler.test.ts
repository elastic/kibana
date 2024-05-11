/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ISavedObjectsRepository, Logger } from '@kbn/core/server';

import { partiallyUpdateAdHocRun } from './lib';
import { AdHocTaskRunningHandler } from './ad_hoc_task_running_handler';
import { adHocRunStatus } from '../../common/constants';

jest.mock('./lib', () => ({
  partiallyUpdateAdHocRun: jest.fn(),
}));

describe('isRunning handler', () => {
  const soClient = jest.fn() as unknown as ISavedObjectsRepository;
  const logger = {
    error: jest.fn(),
  } as unknown as Logger;
  beforeEach(() => {
    (partiallyUpdateAdHocRun as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('Should resolve if nothing got started', async () => {
    (partiallyUpdateAdHocRun as jest.Mock).mockImplementation(() => Promise.resolve('resolve'));
    const runHandler = new AdHocTaskRunningHandler(soClient, logger);
    const resp = await runHandler.waitFor();
    expect(partiallyUpdateAdHocRun).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(resp).toBe(undefined);
  });

  test('Should return the promise from partiallyUpdateAdHocRun when the update isRunning has been a success', async () => {
    (partiallyUpdateAdHocRun as jest.Mock).mockImplementation(() => Promise.resolve('resolve'));
    const runHandler = new AdHocTaskRunningHandler(soClient, logger);
    runHandler.start('9876543210', [
      {
        runAt: '2024-03-01T01:00:00.000Z',
        status: adHocRunStatus.RUNNING,
        interval: '1h',
      },
      {
        runAt: '2024-03-01T02:00:00.000Z',
        status: adHocRunStatus.PENDING,
        interval: '1h',
      },
    ]);
    jest.runAllTimers();
    const resp = await runHandler.waitFor();

    expect(partiallyUpdateAdHocRun).toHaveBeenCalledTimes(1);
    expect((partiallyUpdateAdHocRun as jest.Mock).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        [MockFunction],
        "9876543210",
        Object {
          "schedule": Array [
            Object {
              "interval": "1h",
              "runAt": "2024-03-01T01:00:00.000Z",
              "status": "running",
            },
            Object {
              "interval": "1h",
              "runAt": "2024-03-01T02:00:00.000Z",
              "status": "pending",
            },
          ],
          "status": "running",
        },
        Object {
          "ignore404": true,
          "namespace": undefined,
          "refresh": false,
        },
      ]
    `);
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(resp).toBe('resolve');
  });

  test('Should reject when the update isRunning has been a failure', async () => {
    (partiallyUpdateAdHocRun as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('error'))
    );
    const runHandler = new AdHocTaskRunningHandler(soClient, logger);
    runHandler.start('9876543210', [
      {
        runAt: '2024-03-01T01:00:00.000Z',
        status: adHocRunStatus.RUNNING,
        interval: '1h',
      },
      {
        runAt: '2024-03-01T02:00:00.000Z',
        status: adHocRunStatus.PENDING,
        interval: '1h',
      },
    ]);
    jest.runAllTimers();

    await expect(runHandler.waitFor()).rejects.toThrow();
    expect(partiallyUpdateAdHocRun).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
