/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registrationServicesMock } from '../../mocks';
import { SUB_ACTION } from '../../../common/inference/constants';

const ACTION_TYPE_ID = '.inference';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('connector type static data is as expected', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.selectMessage).toBe(
      'Send a request to an OpenAI or Azure OpenAI service.'
    );
    expect(actionTypeModel.actionTypeTitle).toBe('OpenAI');
  });
});

describe('OpenAI action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.COMPLETION,
      subActionParams: { input: 'message test' },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { input: [], subAction: [] },
    });
  });

  test('params validation fails when params is a wrong object', async () => {
    const actionParams = {
      subAction: SUB_ACTION.COMPLETION,
      subActionParams: { body: 'message {test}' },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { body: ['Body does not have a valid JSON format.'], subAction: [] },
    });
  });

  test('params validation fails when subAction is missing', async () => {
    const actionParams = {
      subActionParams: { input: 'message test' },
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: [],
        subAction: ['Action is required.'],
      },
    });
  });

  test('params validation fails when subActionParams is missing', async () => {
    const actionParams = {
      subAction: SUB_ACTION.RERANK,
      subActionParams: {},
    };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        input: ['Input is required.'],
        subAction: [],
      },
    });
  });
});
