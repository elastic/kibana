/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '.././index';
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
  test('connector validation succeeds when connector config is valid', () => {
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
        mappings: {
          caseIdConfig: { id: '1234' },
        },
      },
    } as SwimlaneActionConnector;
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: { errors: { apiUrl: [], appId: [], mappings: [], connectorType: [] } },
      secrets: { errors: { apiToken: [] } },
    });

    // @ts-ignore
    delete actionConnector.config.apiUrl;
    actionConnector.secrets.apiToken = 'test1';
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: { apiUrl: ['URL is required.'], appId: [], mappings: [], connectorType: [] },
      },
      secrets: { errors: { apiToken: [] } },
    });
  });
});

describe('swimlane action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      subActionParams: {
        ruleName: 'Rule Name',
      },
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.ruleName': [],
      },
    });
  });
});
