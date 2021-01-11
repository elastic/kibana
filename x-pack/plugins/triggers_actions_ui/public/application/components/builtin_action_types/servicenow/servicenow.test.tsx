/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '.././index';
import { ActionTypeModel } from '../../../../types';
import { ServiceNowActionConnector } from './types';

const ACTION_TYPE_ID = '.servicenow';
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

describe('servicenow connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        username: 'user',
        password: 'pass',
      },
      id: 'test',
      actionTypeId: '.servicenow',
      name: 'ServiceNow',
      isPreconfigured: false,
      config: {
        apiUrl: 'https://dev94428.service-now.com/',
      },
    } as ServiceNowActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          apiUrl: [],
        },
      },
      secrets: {
        errors: {
          username: [],
          password: [],
        },
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = ({
      secrets: {
        username: 'user',
      },
      id: '.servicenow',
      actionTypeId: '.servicenow',
      name: 'servicenow',
      config: {},
    } as unknown) as ServiceNowActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      config: {
        errors: {
          apiUrl: ['URL is required.'],
        },
      },
      secrets: {
        errors: {
          username: [],
          password: ['Password is required.'],
        },
      },
    });
  });
});

describe('servicenow action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      subActionParams: { incident: { short_description: 'some title {{test}}' }, comments: [] },
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { ['subActionParams.incident.short_description']: [] },
    });
  });

  test('params validation fails when body is not valid', () => {
    const actionParams = {
      subActionParams: { incident: { short_description: '' }, comments: [] },
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        ['subActionParams.incident.short_description']: ['Short description is required.'],
      },
    });
  });
});
