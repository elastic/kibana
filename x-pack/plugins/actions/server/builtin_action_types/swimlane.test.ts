/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
  getBodyForEventAction,
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
      validateConfig(actionType, {
        apiUrl: 'bar',
        appId: '345',
        mappings: {
          alertNameKeyName: 'alert-name',
          alertSourceKeyName: 'product-source',
          severityKeyName: 'severity',
          caseNameKeyName: 'case-name',
          caseIdKeyName: 'case-id',
        },
      })
    ).toEqual({
      apiUrl: 'bar',
      appId: '345',
      mappings: {
        alertNameKeyName: 'alert-name',
        alertSourceKeyName: 'product-source',
        severityKeyName: 'severity',
        caseNameKeyName: 'case-name',
        caseIdKeyName: 'case-id',
        commentsKeyName: null,
      },
    });
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(actionType, {
        apiUrl: 'bar',
        appId: '345',
        mappings: {
          alertNameKeyName: 'alert-name',
          alertSourceKeyName: 'product-source',
          severityKeyName: 'severity',
          caseNameKeyName: 'case-name',
          caseIdKeyName: 'case-id',
        },
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
        mappings: {
          alertNameKeyName: 'alert-name',
          alertSourceKeyName: 'product-source',
          severityKeyName: 'severity',
          caseNameKeyName: 'case-name',
          caseIdKeyName: 'case-id',
        },
      })
    ).toEqual({
      apiUrl: 'https://test.swimlane.com',
      appId: '345',
      mappings: {
        alertNameKeyName: 'alert-name',
        alertSourceKeyName: 'product-source',
        severityKeyName: 'severity',
        caseNameKeyName: 'case-name',
        caseIdKeyName: 'case-id',
        commentsKeyName: null,
      },
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
        mappings: {
          alertNameKeyName: 'alert-name',
          alertSourceKeyName: 'product-source',
          severityKeyName: 'severity',
          caseNameKeyName: 'case-name',
          caseIdKeyName: 'case-id',
        },
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
      comments: 'my comments',
      severity: 'critical',
      alertSource: 'elastic',
      caseId: null,
      caseName: null,
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

describe('getBodyForEventAction()', () => {
  test('should return body when transformation happens', () => {
    const config = {
      apiUrl: 'https://test.swimlane.com',
      appId: '345',
      mappings: {
        alertNameKeyName: 'alert-name',
        alertSourceKeyName: 'product-source',
        severityKeyName: 'severity',
        caseNameKeyName: 'case-name',
        caseIdKeyName: 'case-id',
        commentsKeyName: 'comments-key',
      },
    };

    const params = {
      alertName: 'alert name',
      comments: 'my comments',
      severity: 'critical',
      alertSource: 'elastic',
      caseId: '3456',
      caseName: 'case name',
    };

    const actual = {
      applicationId: config.appId,
      values: {
        'alert-name': 'alert name',
        'product-source': 'elastic',
        severity: 'critical',
        'case-name': 'case name',
        'case-id': '3456',
        'comments-key': 'my comments',
      },
    };

    expect(getBodyForEventAction('', config, params)).toEqual(actual);
  });
});
