/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ISavedObjectsRepository, Logger } from '@kbn/core/server';

import { partiallyUpdateRule } from '../saved_objects/partially_update_rule';
import { RunningHandler } from './running_handler';

jest.mock('../saved_objects/partially_update_rule', () => ({
  partiallyUpdateRule: jest.fn(),
}));

describe('isRunning handler', () => {
  const soClient = jest.fn() as unknown as ISavedObjectsRepository;
  const logger = {
    error: jest.fn(),
  } as unknown as Logger;
  const ruleTypeId = 'myType';
  beforeEach(() => {
    (partiallyUpdateRule as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('Should resolve if nothing got started', async () => {
    (partiallyUpdateRule as jest.Mock).mockImplementation(() => Promise.resolve('resolve'));
    const runHandler = new RunningHandler(soClient, logger, ruleTypeId);
    const resp = await runHandler.waitFor();
    expect(partiallyUpdateRule).toHaveBeenCalledTimes(0);
    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(resp).toBe(undefined);
  });

  test('Should return the promise from partiallyUpdateRule when the update isRunning has been a success', async () => {
    (partiallyUpdateRule as jest.Mock).mockImplementation(() => Promise.resolve('resolve'));
    const runHandler = new RunningHandler(soClient, logger, ruleTypeId);
    runHandler.start('9876543210');
    jest.runAllTimers();
    const resp = await runHandler.waitFor();

    expect(partiallyUpdateRule).toHaveBeenCalledTimes(1);
    expect((partiallyUpdateRule as jest.Mock).mock.calls[0]).toMatchInlineSnapshot(`
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
    (partiallyUpdateRule as jest.Mock).mockImplementation(() => Promise.reject(new Error('error')));
    const runHandler = new RunningHandler(soClient, logger, ruleTypeId);
    runHandler.start('9876543210');
    jest.runAllTimers();

    await expect(runHandler.waitFor()).rejects.toThrow();
    expect(partiallyUpdateRule).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
