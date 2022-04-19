/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { JiraActionConnector } from './types';

const ACTION_TYPE_ID = '.jira';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
  });
});

describe('jira connector validation', () => {
  test('connector validation succeeds when connector config is valid', async () => {
    const actionConnector = {
      secrets: {
        email: 'email',
        apiToken: 'apiToken',
      },
      id: 'test',
      actionTypeId: '.jira',
      name: 'jira',
      isPreconfigured: false,
      isDeprecated: false,
      config: {
        apiUrl: 'https://siem-kibana.atlassian.net',
        projectKey: 'CK',
      },
    } as JiraActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          apiUrl: [],
          projectKey: [],
        },
      },
      secrets: {
        errors: {
          apiToken: [],
          email: [],
        },
      },
    });
  });

  test('connector validation fails when connector config is not valid', async () => {
    const actionConnector = {
      secrets: {
        email: 'user',
      },
      id: '.jira',
      actionTypeId: '.jira',
      name: 'jira',
      config: {},
    } as unknown as JiraActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          apiUrl: ['URL is required.'],
          projectKey: ['Project key is required'],
        },
      },
      secrets: {
        errors: {
          apiToken: ['API token is required'],
          email: [],
        },
      },
    });
  });
});

describe('jira action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subActionParams: { incident: { summary: 'some title {{test}}' }, comments: [] },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { 'subActionParams.incident.summary': [], 'subActionParams.incident.labels': [] },
    });
  });

  test('params validation fails when body is not valid', async () => {
    const actionParams = {
      subActionParams: { incident: { summary: '' }, comments: [] },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': ['Summary is required.'],
        'subActionParams.incident.labels': [],
      },
    });
  });

  test('params validation fails when labels contain spaces', async () => {
    const actionParams = {
      subActionParams: {
        incident: { summary: 'some title', labels: ['label with spaces'] },
        comments: [],
      },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.summary': [],
        'subActionParams.incident.labels': ['Labels cannot contain spaces.'],
      },
    });
  });
});
