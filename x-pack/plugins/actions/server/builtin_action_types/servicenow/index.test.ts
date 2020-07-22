/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getActionType } from '.';
import { ActionType, Services, ActionTypeExecutorOptions } from '../../types';
import { validateConfig, validateSecrets, validateParams } from '../../lib';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { createActionTypeRegistry } from '../index.test';
import { actionsConfigMock } from '../../actions_config.mock';

import { ACTION_TYPE_ID } from './constants';
import * as i18n from './translations';

import { handleIncident } from './action_handlers';
import { incidentResponse } from './mock';

jest.mock('./action_handlers');

const handleIncidentMock = handleIncident as jest.Mock;

const services: Services = {
  callCluster: async (path: string, opts: any) => {},
  savedObjectsClient: savedObjectsClientMock.create(),
};

let actionType: ActionType;

const mockOptions = {
  name: 'servicenow-connector',
  actionTypeId: '.servicenow',
  secrets: {
    username: 'secret-username',
    password: 'secret-password',
  },
  config: {
    apiUrl: 'https://service-now.com',
    casesConfiguration: {
      mapping: [
        {
          source: 'title',
          target: 'short_description',
          actionType: 'overwrite',
        },
        {
          source: 'description',
          target: 'description',
          actionType: 'overwrite',
        },
        {
          source: 'comments',
          target: 'work_notes',
          actionType: 'append',
        },
      ],
    },
  },
  params: {
    caseId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
    incidentId: 'ceb5986e079f00100e48fbbf7c1ed06d',
    title: 'Incident title',
    description: 'Incident description',
    createdAt: '2020-03-13T08:34:53.450Z',
    createdBy: { fullName: 'Elastic User', username: 'elastic' },
    updatedAt: null,
    updatedBy: null,
    comments: [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        version: 'WzU3LDFd',
        comment: 'A comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ],
  },
};

beforeAll(() => {
  const { actionTypeRegistry } = createActionTypeRegistry();
  actionType = actionTypeRegistry.get(ACTION_TYPE_ID);
});

describe('get()', () => {
  test('should return correct action type', () => {
    expect(actionType.id).toEqual(ACTION_TYPE_ID);
    expect(actionType.name).toEqual(i18n.NAME);
  });
});

describe('validateConfig()', () => {
  test('should validate and pass when config is valid', () => {
    const { config } = mockOptions;
    expect(validateConfig(actionType, config)).toEqual(config);
  });

  test('should validate and throw error when config is invalid', () => {
    expect(() => {
      validateConfig(actionType, { shouldNotBeHere: true });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: [apiUrl]: expected value of type [string] but got [undefined]"`
    );
  });

  test('should validate and pass when the servicenow url is whitelisted', () => {
    actionType = getActionType({
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureWhitelistedUri: (url) => {
          expect(url).toEqual(mockOptions.config.apiUrl);
        },
      },
    });

    expect(validateConfig(actionType, mockOptions.config)).toEqual(mockOptions.config);
  });

  test('config validation returns an error if the specified URL isnt whitelisted', () => {
    actionType = getActionType({
      configurationUtilities: {
        ...actionsConfigMock.create(),
        ensureWhitelistedUri: (_) => {
          throw new Error(`target url is not whitelisted`);
        },
      },
    });

    expect(() => {
      validateConfig(actionType, mockOptions.config);
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type config: error configuring servicenow action: target url is not whitelisted"`
    );
  });
});

describe('validateSecrets()', () => {
  test('should validate and pass when secrets is valid', () => {
    const { secrets } = mockOptions;
    expect(validateSecrets(actionType, secrets)).toEqual(secrets);
  });

  test('should validate and throw error when secrets is invalid', () => {
    expect(() => {
      validateSecrets(actionType, { username: false });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [password]: expected value of type [string] but got [undefined]"`
    );

    expect(() => {
      validateSecrets(actionType, { username: false, password: 'hello' });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action type secrets: [username]: expected value of type [string] but got [boolean]"`
    );
  });
});

describe('validateParams()', () => {
  test('should validate and pass when params is valid', () => {
    const { params } = mockOptions;
    expect(validateParams(actionType, params)).toEqual(params);
  });

  test('should validate and throw error when params is invalid', () => {
    expect(() => {
      validateParams(actionType, {});
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating action params: [caseId]: expected value of type [string] but got [undefined]"`
    );
  });
});

describe('execute()', () => {
  beforeEach(() => {
    handleIncidentMock.mockReset();
  });

  test('should create an incident', async () => {
    const actionId = 'some-id';
    const { incidentId, ...rest } = mockOptions.params;

    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config: mockOptions.config,
      params: { ...rest },
      secrets: mockOptions.secrets,
      services,
    };

    handleIncidentMock.mockImplementation(() => incidentResponse);

    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toEqual({ actionId, status: 'ok', data: incidentResponse });
  });

  test('should throw an error when failed to create incident', async () => {
    expect.assertions(1);
    const { incidentId, ...rest } = mockOptions.params;

    const actionId = 'some-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config: mockOptions.config,
      params: { ...rest },
      secrets: mockOptions.secrets,
      services,
    };
    const errorMessage = 'Failed to create incident';

    handleIncidentMock.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    try {
      await actionType.executor(executorOptions);
    } catch (error) {
      expect(error.message).toEqual(errorMessage);
    }
  });

  test('should update an incident', async () => {
    const actionId = 'some-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config: mockOptions.config,
      params: {
        ...mockOptions.params,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { fullName: 'Another User', username: 'anotherUser' },
      },
      secrets: mockOptions.secrets,
      services,
    };

    handleIncidentMock.mockImplementation(() => incidentResponse);

    const actionResponse = await actionType.executor(executorOptions);
    expect(actionResponse).toEqual({ actionId, status: 'ok', data: incidentResponse });
  });

  test('should throw an error when failed to update an incident', async () => {
    expect.assertions(1);

    const actionId = 'some-id';
    const executorOptions: ActionTypeExecutorOptions = {
      actionId,
      config: mockOptions.config,
      params: {
        ...mockOptions.params,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { fullName: 'Another User', username: 'anotherUser' },
      },
      secrets: mockOptions.secrets,
      services,
    };
    const errorMessage = 'Failed to update incident';

    handleIncidentMock.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    try {
      await actionType.executor(executorOptions);
    } catch (error) {
      expect(error.message).toEqual(errorMessage);
    }
  });
});
