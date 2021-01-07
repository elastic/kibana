/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SeverityActionOptions } from '../../../triggers_actions_ui/public/application/components/builtin_action_types/types';

jest.mock('./lib/post_swimlane', () => ({
  postSwimlane: jest.fn(),
}));

import { validateConfig, validateParams, validateSecrets } from '../lib';
import { createActionTypeRegistry } from './index.test';
import { Logger } from '@kbn/logging';
import { actionsConfigMock } from '../actions_config.mock';
import {
  ActionParamsType,
  ActionTypeConfigType,
  ActionTypeSecretsType,
  getActionType,
  SwimlaneActionType,
} from './swimlane';

const ACTION_TYPE_ID = '.swimlane';

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
    expect(
      validateConfig(actionType, { apiUrl: 'bar', appId: '345', username: 'testuser' })
    ).toEqual({
      apiUrl: 'bar',
      appId: '345',
      username: 'testuser',
    });
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(actionType, {
        apiUrl: 'bar',
        appId: '345',
        username: 'testuser',
        shouldNotBeHere: true,
      });
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
          expect(url).toContain('https://test.swimlane.com');
        },
      },
    });

    expect(
      validateConfig(actionType, {
        apiUrl: 'https://test.swimlane.com',
        appId: '345',
        username: 'testuser',
      })
    ).toEqual({
      apiUrl: 'https://test.swimlane.com',
      appId: '345',
      username: 'testuser',
    });
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
      validateConfig(actionType, {
        apiUrl: 'https://test.swimlane.com',
        appId: '345',
        username: 'testuser',
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring swimlane action: target url is not added to allowedHosts"`
    );
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    const params = {
      alertName: 'alert name',
      tags: 'tags',
      comments: 'my comments',
      severity: SeverityActionOptions.CRITICAL,
    };

    expect(validateParams(actionType, params)).toEqual(params);
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
