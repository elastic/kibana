/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { registrationServicesMock } from '../../mocks';
import { OpsgenieConnectorTypeId, OpsgenieSubActions } from '../../../common';

let connectorTypeModel: ConnectorTypeModel;

beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(OpsgenieConnectorTypeId);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('connectorTypeRegistry.get() works', () => {
  it('sets the id field in the connector type static data to the correct opsgenie value', () => {
    expect(connectorTypeModel.id).toEqual(OpsgenieConnectorTypeId);
  });
});

describe('opsgenie action params validation', () => {
  it('results in no errors when the action params are valid for creating an alert', async () => {
    const actionParams = {
      subAction: OpsgenieSubActions.CreateAlert,
      subActionParams: {
        message: 'hello',
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.message': [],
        'subActionParams.alias': [],
        jsonEditorError: [],
      },
    });
  });

  it('results in no errors when the action params are valid for closing an alert', async () => {
    const actionParams = {
      subAction: OpsgenieSubActions.CloseAlert,
      subActionParams: {
        alias: '123',
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.message': [],
        'subActionParams.alias': [],
        jsonEditorError: [],
      },
    });
  });

  it('sets the message error when the message is missing for creating an alert', async () => {
    const actionParams = {
      subAction: OpsgenieSubActions.CreateAlert,
      subActionParams: {},
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.message': ['Message is required.'],
        'subActionParams.alias': [],
        jsonEditorError: [],
      },
    });
  });

  it('sets the alias error when the alias is missing for closing an alert', async () => {
    const actionParams = {
      subAction: OpsgenieSubActions.CloseAlert,
      subActionParams: {},
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.message': [],
        'subActionParams.alias': ['Alias is required.'],
        jsonEditorError: [],
      },
    });
  });

  it('sets the jsonEditorError when the jsonEditorError field is set to true', async () => {
    const actionParams = {
      jsonEditorError: true,
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.message': [],
        'subActionParams.alias': [],
        jsonEditorError: ['JSON editor error exists'],
      },
    });
  });
});
