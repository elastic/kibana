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

const ACTION_TYPE_ID = '.swimlane';
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
