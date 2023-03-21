/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ISavedObjectsRepository, Logger } from '@kbn/core/server';

import { partiallyUpdateAlert } from '../saved_objects/partially_update_alert';
import { RunningHandler } from './running_handler';

jest.mock('../saved_objects/partially_update_alert', () => ({
  partiallyUpdateAlert: jest.fn(),
}));

describe('isRunning handler', () => {
  const soClient = jest.fn() as unknown as ISavedObjectsRepository;
  const logger = {
    error: jest.fn(),
  } as unknown as Logger;
  const ruleTypeId = 'myType';
  beforeEach(() => {
    (partiallyUpdateAlert as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('Should resolve if nothing got started', async () => {
    (partiallyUpdateAlert as jest.Mock).mockImplementation(() => Promise.resolve('resolve'));
    const runHandler = new RunningHandler(soClient, logger, ruleTypeId);
    const resp = await runHandler.waitFor();
    expect(partiallyUpdateAlert).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(resp).toBe(undefined);
  });

  test('Should return the promise from partiallyUpdateAlert when the update isRunning has been a success', async () => {
    (partiallyUpdateAlert as jest.Mock).mockImplementation(() => Promise.resolve('resolve'));
    const runHandler = new RunningHandler(soClient, logger, ruleTypeId);
    runHandler.start('9876543210');
    jest.runAllTimers();
    const resp = await runHandler.waitFor();

    expect(partiallyUpdateAlert).toHaveBeenCalledTimes(1);
    expect((partiallyUpdateAlert as jest.Mock).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        [MockFunction],
        "9876543210",
        Object {
          "running": true,
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
    (partiallyUpdateAlert as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error('error'))
    );
    const runHandler = new RunningHandler(soClient, logger, ruleTypeId);
    runHandler.start('9876543210');
    jest.runAllTimers();

    await expect(runHandler.waitFor()).rejects.toThrow();
    expect(partiallyUpdateAlert).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
