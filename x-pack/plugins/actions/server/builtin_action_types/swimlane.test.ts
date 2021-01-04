/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/post_swimlane', () => ({
  postSwimlane: jest.fn(),
}));

import { Services } from '../types';
import { validateConfig, validateSecrets, validateParams } from '../lib';
import { postSwimlane } from './lib/post_swimlane';
import { createActionTypeRegistry } from './index.test';
import { Logger } from '../../../../../src/core/server';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ActionTypeSecretsType,
  getActionType,
  SwimlaneActionType,
  SwimlaneActionTypeExecutorOptions,
} from './swimlane';

const postSwimlaneMock = postSwimlane as jest.Mock;

const ACTION_TYPE_ID = '.swimlane';

const services: Services = actionsMock.createServices();

let actionType: SwimlaneActionType;
let mockedLogger: jest.Mocked<Logger>;

beforeAll(() => {
  const { logger, actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get<
    ActionTypeConfigType,
    ActionTypeSecretsType,
    ActionParamsType
  >(ACTION_TYPE_ID);
  mockedLogger = logger;
});

describe('get()', () => {
  test('should return correct action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual('Swimlane');
  });
});

describe('validateConfig()', () => {
  test('should validate and pass when config is valid', () => {
    expect(validateConfig(actionType, {})).toEqual({ apiUrl: null });
    expect(validateConfig(actionType, { apiUrl: 'bar' })).toEqual({ apiUrl: 'bar' });
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(actionType, { shouldNotBeHere: true });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [shouldNotBeHere]: definition for this key is missing"`
    );
  });

  test('should validate and pass when the swimlane url is added to allowedHosts', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (url) => {
          expect(url).toBe();
        },
      },
    });

    expect(
      validateConfig(actionType, { apiUrl: 'https://test.swimlane.com' })
    ).toEqual({ apiUrl: 'https://test.swimlane.com' });
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    actionType = getActionType({
      logger: mockedLogger,
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureUriAllowed: (_) => {
          throw new Error(`target url is not added to allowedHosts`);
        },
      },
    });

    expect(() => {
      validateConfig(actionType, { apiUrl: 'https://test.swimlane.com' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring SWIMLANE action: target url is not added to allowedHosts"`
    );
  });
});

describe('validateSecrets()', () => {
  test('should validate and pass when secrets is valid', () => {
    const apiToken = 'super-secret';
    expect(validateSecrets(actionType, { apiToken })).toEqual({
      apiToken,
    });
  });

  test('should validate and throw error when secrets is invalid', () => {
    expect(() => {
      validateSecrets(actionType, { apiToken: false });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [apiToken]: expected value of type [string] but got [boolean]"`
    );

    expect(() => {
      validateSecrets(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [apiToken]: expected value of type [string] but got [undefined]"`
    );
  });
});
