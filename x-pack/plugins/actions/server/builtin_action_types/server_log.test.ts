/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateParams } from '../lib';
import { Logger } from '@kbn/core/server';
import { createActionTypeRegistry } from './index.test';
import { actionsMock } from '../mocks';
import {
  ActionParamsType,
  ServerLogActionType,
  ServerLogActionTypeExecutorOptions,
} from './server_log';

const ACTION_TYPE_ID = '.server-log';

let actionType: ServerLogActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<{}, {}, ActionParamsType>(ACTION_TYPE_ID);
  mockedLogger = logger;
  expect(actionType).toBeTruthy();
});

describe('get()', () => {
  test('returns action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('Server log');
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    expect(validateParams(actionType, { message: 'a message', level: 'info' })).toEqual({
      message: 'a message',
      level: 'info',
    });
    expect(
      validateParams(actionType, {
        message: 'a message',
        level: 'info',
      })
    ).toEqual({
      message: 'a message',
      level: 'info',
    });
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateParams(actionType, { message: 1 });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [message]: expected value of type [string] but got [number]"`
    );

    expect(() => {
      validateParams(actionType, { message: 'x', level: 2 });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action params: [level]: types that failed validation:
- [level.0]: expected value to equal [trace]
- [level.1]: expected value to equal [debug]
- [level.2]: expected value to equal [info]
- [level.3]: expected value to equal [warn]
- [level.4]: expected value to equal [error]
- [level.5]: expected value to equal [fatal]"
`);

    expect(() => {
      validateParams(actionType, { message: 'x', level: 'foo' });
    }).toThrowErrorMatchingInlineSnapshot(`
"error validating action params: [level]: types that failed validation:
- [level.0]: expected value to equal [trace]
- [level.1]: expected value to equal [debug]
- [level.2]: expected value to equal [info]
- [level.3]: expected value to equal [warn]
- [level.4]: expected value to equal [error]
- [level.5]: expected value to equal [fatal]"
`);
  });
});

describe('execute()', () => {
  test('calls the executor with proper params', async () => {
    const actionId = 'some-id';
    const executorOptions: ServerLogActionTypeExecutorOptions = {
      actionId,
      services: actionsMock.createServices(),
      params: { message: 'message text here', level: 'info' },
      config: {},
      secrets: {},
    };
    await actionType.executor(executorOptions);
    expect(mockedLogger.info).toHaveBeenCalledWith('Server log: message text here');
  });
});
