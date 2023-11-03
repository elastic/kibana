/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '@kbn/triggers-actions-ui-plugin/public/application/type_registry';
import { registerConnectorTypes } from '..';
import type { ActionTypeModel as ConnectorTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import { experimentalFeaturesMock, registrationServicesMock } from '../../mocks';
import { ExperimentalFeaturesService } from '../../common/experimental_features_service';

const CONNECTOR_TYPE_ID = '.swimlane';
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

describe('connectorTypeRegistry.get() works', () => {
  test('connector type static data is as expected', () => {
    expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
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

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
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

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
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

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        'subActionParams.incident.ruleName': [],
        'subActionParams.incident.alertId': [],
      },
    });
  });
});
