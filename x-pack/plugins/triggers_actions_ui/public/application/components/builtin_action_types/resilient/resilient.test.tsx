/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '.././index';
import { ActionTypeModel } from '../../../../types';
import { ResilientActionConnector } from './types';

const ACTION_TYPE_ID = '.resilient';
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

describe('resilient connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        apiKeyId: 'email',
        apiKeySecret: 'token',
      },
      id: 'test',
      actionTypeId: '.resilient',
      isPreconfigured: false,
      name: 'resilient',
      config: {
        apiUrl: 'https://test/',
        orgId: '201',
      },
    } as ResilientActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        apiUrl: [],
        apiKeyId: [],
        apiKeySecret: [],
        orgId: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = ({
      secrets: {
        apiKeyId: 'user',
      },
      id: '.jira',
      actionTypeId: '.jira',
      name: 'jira',
      config: {},
    } as unknown) as ResilientActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        apiUrl: ['URL is required.'],
        apiKeyId: [],
        apiKeySecret: ['Secret is required'],
        orgId: ['Organization ID is required'],
      },
    });
  });
});

describe('resilient action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      subActionParams: { title: 'some title {{test}}' },
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { title: [] },
    });
  });

  test('params validation fails when body is not valid', () => {
    const actionParams = {
      subActionParams: { title: '' },
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        title: ['Title is required.'],
      },
    });
  });
});
