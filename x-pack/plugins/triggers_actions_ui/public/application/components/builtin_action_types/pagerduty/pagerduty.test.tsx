/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { registrationServicesMock } from '../../../../mocks';

const ACTION_TYPE_ID = '.pagerduty';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry, services: registrationServicesMock });
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
