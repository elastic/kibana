/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '../..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registrationServicesMock } from '../../../mocks';
import { TinesExecuteActionParams } from './types';
import {
  SUB_ACTION,
  TINES_CONNECTOR_ID,
  TINES_TITLE,
} from '../../../../common/connector_types/security/tines/constants';

let actionTypeModel: ConnectorTypeModel;

const webhook = {
  id: 1234,
  name: 'some webhook action',
  storyId: 5435,
  path: 'somePath',
  secret: 'someSecret',
};
const actionParams: TinesExecuteActionParams = {
  subAction: SUB_ACTION.RUN,
  subActionParams: { webhook },
};

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(TINES_CONNECTOR_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  it('should get Tines action type static data', () => {
    expect(actionTypeModel.id).toEqual(TINES_CONNECTOR_ID);
    expect(actionTypeModel.actionTypeTitle).toEqual(TINES_TITLE);
  });
});

describe('tines action params validation', () => {
  it('should fail when storyId is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { webhook: { ...webhook, storyId: undefined } },
    });
    expect(validation.errors).toEqual({
      subAction: [],
      story: ['Story is required.'],
      webhook: [],
      body: [],
    });
  });

  it('should fail when webhook is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { webhook: { ...webhook, id: undefined } },
    });
    expect(validation.errors).toEqual({
      subAction: [],
      story: [],
      webhook: ['Webhook is required.'],
      body: [],
    });
  });

  it('should fail when webhook path is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { webhook: { ...webhook, path: '' } },
    });
    expect(validation.errors).toEqual({
      subAction: [],
      story: [],
      webhook: ['Webhook action path is missing.'],
      body: [],
    });
  });

  it('should fail when webhook secret is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subActionParams: { webhook: { ...webhook, secret: '' } },
    });
    expect(validation.errors).toEqual({
      subAction: [],
      story: [],
      webhook: ['Webhook action secret is missing.'],
      body: [],
    });
  });

  it('should succeed when subAction is run and params are correct', async () => {
    const validation = await actionTypeModel.validateParams(actionParams);
    expect(validation.errors).toEqual({
      subAction: [],
      story: [],
      webhook: [],
      body: [],
    });
  });

  it('should fail when subAction is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subAction: '',
    });
    expect(validation.errors).toEqual({
      subAction: ['Action is required.'],
      story: [],
      webhook: [],
      body: [],
    });
  });
  it('should fail when subAction is wrong', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subAction: 'stories',
    });
    expect(validation.errors).toEqual({
      subAction: ['Invalid action name.'],
      story: [],
      webhook: [],
      body: [],
    });
  });

  it('should fail when subAction is test and body is missing', async () => {
    const validation = await actionTypeModel.validateParams({
      ...actionParams,
      subAction: SUB_ACTION.TEST,
    });
    expect(validation.errors).toEqual({
      subAction: [],
      story: [],
      webhook: [],
      body: ['Body is required.'],
    });
  });

  it('should fail when subAction is test and body is not JSON format', async () => {
    const validation = await actionTypeModel.validateParams({
      subAction: SUB_ACTION.TEST,
      subActionParams: { webhook, body: 'not json' },
    });
    expect(validation.errors).toEqual({
      subAction: [],
      story: [],
      webhook: [],
      body: ['Body does not have a valid JSON format.'],
    });
  });

  it('should succeed when subAction is test and params are correct', async () => {
    const validation = await actionTypeModel.validateParams({
      subAction: SUB_ACTION.TEST,
      subActionParams: { webhook, body: '[]' },
    });
    expect(validation.errors).toEqual({
      subAction: [],
      story: [],
      webhook: [],
      body: [],
    });
  });
});
