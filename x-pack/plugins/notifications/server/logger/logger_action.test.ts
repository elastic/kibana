/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionResult, ServerFacade } from '..';
import { LOGGER_ACTION_ID, LoggerAction } from './logger_action';

describe('LoggerAction', () => {
  const server: ServerFacade = {
    log: jest.fn(),
    config: jest.fn(),
    plugins: { xpack_main: { info: { license: { isNotBasic: () => true } } } },
  };

  const action = new LoggerAction({ server });

  test('id and name to be from constructor', () => {
    expect(action.getId()).toBe(LOGGER_ACTION_ID);
    expect(action.getName()).toBe('Log');
  });

  test('getMissingFields to return []', () => {
    expect(action.getMissingFields({})).toEqual([]);
  });

  test('doPerformHealthCheck returns ActionResult', async () => {
    const result = await action.doPerformHealthCheck();

    expect(result instanceof ActionResult).toBe(true);
    expect(result.isOk()).toBe(true);
    expect(result.getMessage()).toMatch('Logger action is always usable.');
    expect(result.getResponse()).toEqual({});
  });

  test('doPerformAction logs and returns ActionResult', async () => {
    const notification = { fake: true };
    const result = await new LoggerAction({ server }).doPerformAction(notification);

    expect(result instanceof ActionResult).toBe(true);
    expect(result.isOk()).toBe(true);
    expect(result.getMessage()).toMatch('Logged data returned as response.');
    expect(result.getResponse()).toBe(notification);

    expect(server.log).toHaveBeenCalledTimes(1);
    expect(server.log).toHaveBeenCalledWith([LOGGER_ACTION_ID, 'info'], notification);
  });
});
