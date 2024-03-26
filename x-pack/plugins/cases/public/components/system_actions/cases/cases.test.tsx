/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import type {
  ActionTypeModel,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { getConnectorType } from './cases';
const CONNECTOR_TYPE_ID = '.cases';
let connectorTypeModel: ConnectorTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();

  actionTypeRegistry.register(getConnectorType());

  const getResult = actionTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('has correct connector id', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = { subActionParams: { timeWindow: '7d' } };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { timeWindow: [] },
    });
  });

  test('params validation fails when timeWindow is empty', async () => {
    const actionParams = { subActionParams: { timeWindow: '' } };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { timeWindow: ['Invalid time size.'] },
    });
  });

  test('params validation fails when timeWindow is undefined', async () => {
    const actionParams = { subActionParams: { timeWindow: undefined } };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { timeWindow: ['Invalid time size.'] },
    });
  });

  test('params validation fails when timeWindow is null', async () => {
    const actionParams = { subActionParams: { timeWindow: null } };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { timeWindow: ['Invalid time size.'] },
    });
  });

  test('params validation fails when timeWindow size is 0', async () => {
    const actionParams = { subActionParams: { timeWindow: '0d' } };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { timeWindow: ['Invalid time size.'] },
    });
  });

  test('params validation fails when timeWindow size is negative', async () => {
    const actionParams = { subActionParams: { timeWindow: '-5w' } };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { timeWindow: ['Invalid time size.'] },
    });
  });
});
