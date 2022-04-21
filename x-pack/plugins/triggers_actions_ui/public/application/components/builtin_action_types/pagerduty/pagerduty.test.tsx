/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { PagerDutyActionConnector } from '../types';

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
    expect(actionTypeModel.actionTypeTitle).toEqual('Send to PagerDuty');
  });
});

describe('pagerduty connector validation', () => {
  test('connector validation succeeds when connector config is valid', async () => {
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

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      secrets: {
        errors: {
          routingKey: [],
        },
      },
    });

    delete actionConnector.config.apiUrl;
    actionConnector.secrets.routingKey = 'test1';
    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      secrets: {
        errors: {
          routingKey: [],
        },
      },
    });
  });

  test('connector validation fails when connector config is not valid', async () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.pagerduty',
      name: 'pagerduty',
      config: {
        apiUrl: 'http:\\test',
      },
    } as PagerDutyActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
      secrets: {
        errors: {
          routingKey: ['An integration key / routing key is required.'],
        },
      },
    });
  });
});

describe('pagerduty action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
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

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: [],
      },
    });
  });

  test('action params validation fails when the timestamp is invalid', async () => {
    const actionParams = {
      eventAction: 'trigger',
      dedupKey: 'test',
      summary: '2323',
      source: 'source',
      severity: 'critical',
      timestamp: '2011-05-99T03:30-07',
      component: 'test',
      group: 'group',
      class: 'test class',
    };

    const expected = [expect.stringMatching(/^Timestamp must be a valid date/)];

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        dedupKey: [],
        summary: [],
        timestamp: expect.arrayContaining(expected),
      },
    });
  });
});
