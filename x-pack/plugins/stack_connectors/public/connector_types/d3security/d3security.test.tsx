/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { SUB_ACTION } from '../../../common/d3security/constants';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

const CONNECTOR_TYPE_ID = '.d3security';
let connectorTypeModel: ConnectorTypeModel;
beforeAll(() => {
  const connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
  const getResult = connectorTypeRegistry.get(CONNECTOR_TYPE_ID);
  if (getResult !== null) {
    connectorTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
  });
});

describe('d3security action params validation', () => {
  test('action params validation succeeds when action params is valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {
        body: 'message {test}',
        severity: 'test severity',
        eventType: 'test type',
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { body: [], subAction: [] },
    });
  });

  test('params validation fails when body is not valid', async () => {
    const actionParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {
        body: '',
        severity: '',
        eventType: '',
      },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: ['Body is required.'],
        subAction: [],
      },
    });
  });

  test('params validation fails when subAction is missing', async () => {
    const actionParams = {
      subActionParams: { body: '{"message": "test"}' },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: [],
        subAction: ['Action is required.'],
      },
    });
  });

  test('params validation fails when subActionParams is missing', async () => {
    const actionParams = {
      subAction: SUB_ACTION.RUN,
      subActionParams: {},
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        body: ['Body is required.'],
        subAction: [],
      },
    });
  });
});
