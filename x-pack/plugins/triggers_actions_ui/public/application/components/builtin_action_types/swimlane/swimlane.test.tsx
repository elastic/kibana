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
    expect(actionTypeModel.iconClass).toEqual('test-file-stub');
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
      errors: {
        apiToken: [],
        apiUrl: [],
        appId: [],
        mappings: [],
      },
    });

    // @ts-ignore
    delete actionConnector.config.apiUrl;
    actionConnector.secrets.apiToken = 'test1';
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        apiToken: [],
        apiUrl: [],
        appId: [],
        mappings: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
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
      },
    } as SwimlaneActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        apiToken: [],
        apiUrl: [],
        appId: [],
        mappings: ['Field mappings are required.'],
      },
    });
  });
});

describe('swimlane action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      subActionParams: {
        alertName: 'Alert Name',
      },
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        alertName: [],
        alertSource: [],
        caseId: [],
        caseName: [],
        comments: [],
        severity: [],
      },
    });
  });
});
