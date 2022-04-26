/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { SwimlaneActionConnector } from './types';

const ACTION_TYPE_ID = '.swimlane';
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

describe('swimlane connector validation', () => {
  test('connector validation succeeds when connector is valid', async () => {
    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings: {
          alertIdConfig: { id: '1234' },
          severityConfig: { id: '1234' },
          ruleNameConfig: { id: '1234' },
          caseIdConfig: { id: '1234' },
          caseNameConfig: { id: '1234' },
          descriptionConfig: { id: '1234' },
          commentsConfig: { id: '1234' },
        },
      },
    } as SwimlaneActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: { errors: { apiUrl: [], appId: [], mappings: [], connectorType: [] } },
      secrets: { errors: { apiToken: [] } },
    });
  });

  test('it validates correctly when connectorType=all', async () => {
    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'all',
        mappings: {},
      },
    } as SwimlaneActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: { errors: { apiUrl: [], appId: [], mappings: [], connectorType: [] } },
      secrets: { errors: { apiToken: [] } },
    });
  });

  test('it validates correctly when connectorType=cases', async () => {
    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'cases',
        mappings: {},
      },
    } as SwimlaneActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          apiUrl: [],
          appId: [],
          mappings: [
            {
              caseIdConfig: 'Case ID is required.',
              caseNameConfig: 'Case name is required.',
              commentsConfig: 'Comments are required.',
              descriptionConfig: 'Description is required.',
            },
          ],
          connectorType: [],
        },
      },
      secrets: { errors: { apiToken: [] } },
    });
  });

  test('it validates correctly when connectorType=alerts', async () => {
    const actionConnector = {
      secrets: {
        apiToken: 'test',
      },
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {
        apiUrl: 'http:\\test',
        appId: '1234567asbd32',
        connectorType: 'alerts',
        mappings: {},
      },
    } as SwimlaneActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          apiUrl: [],
          appId: [],
          mappings: [
            {
              alertIdConfig: 'Alert ID is required.',
              ruleNameConfig: 'Rule name is required.',
            },
          ],
          connectorType: [],
        },
      },
      secrets: { errors: { apiToken: [] } },
    });
  });

  test('it validates correctly required config/secrets fields', async () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.swimlane',
      name: 'swimlane',
      config: {},
    } as SwimlaneActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          apiUrl: ['URL is required.'],
          appId: ['An App ID is required.'],
          mappings: [],
          connectorType: [],
        },
      },
      secrets: { errors: { apiToken: ['An API token is required.'] } },
    });
  });
});

describe('swimlane action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subActionParams: {
        ruleName: 'Rule Name',
        alertId: 'alert-id',
      },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.ruleName': [],
        'subActionParams.incident.alertId': [],
      },
    });
  });

  test('it validates correctly required fields', async () => {
    const actionParams = {
      subActionParams: { incident: {} },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.ruleName': ['Rule name is required.'],
        'subActionParams.incident.alertId': ['Alert ID is required.'],
      },
    });
  });

  test('it succeeds when missing incident', async () => {
    const actionParams = {
      subActionParams: {},
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.ruleName': [],
        'subActionParams.incident.alertId': [],
      },
    });
  });
});
