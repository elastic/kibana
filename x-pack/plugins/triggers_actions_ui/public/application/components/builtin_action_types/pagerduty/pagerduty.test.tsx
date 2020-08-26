/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '.././index';
import { ActionTypeModel } from '../../../../types';
import { PagerDutyActionConnector } from '.././types';

const ACTION_TYPE_ID = '.pagerduty';
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

describe('pagerduty connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {
        routingKey: 'test',
      },
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
    } as PagerDutyActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        routingKey: [],
      },
    });

    delete actionConnector.config.apiUrl;
    actionConnector.secrets.routingKey = 'test1';
    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        routingKey: [],
      },
    });
  });

  test('connector validation fails when connector config is not valid', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
    } as PagerDutyActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        routingKey: ['An integration key / routing key is required.'],
      },
    });
  });
});

describe('pagerduty action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: new Date().toISOString(),
      component: 'test',
      group: 'group',
      class: 'test class',
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        summary: [],
        timestamp: [],
      },
    });
  });
});
