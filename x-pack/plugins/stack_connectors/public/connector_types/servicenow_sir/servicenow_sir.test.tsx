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

const SERVICENOW_SIR_CONNECTOR_TYPE_ID = '.servicenow-sir';
let connectorTypeRegistry: TypeRegistry<ConnectorTypeModel>;

beforeAll(() => {
  connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
});

describe('connectorTypeRegistry.get() works', () => {
  test(`${SERVICENOW_SIR_CONNECTOR_TYPE_ID}: connector type static data is as expected`, () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_SIR_CONNECTOR_TYPE_ID);
    expect(connectorTypeModel.id).toEqual(SERVICENOW_SIR_CONNECTOR_TYPE_ID);
  });
});

describe('servicenow action params validation', () => {
  test(`${SERVICENOW_SIR_CONNECTOR_TYPE_ID}: action params validation succeeds when action params is valid`, async () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_SIR_CONNECTOR_TYPE_ID);
    const actionParams = {
      subActionParams: { incident: { short_description: 'some title {{test}}' }, comments: [] },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { ['subActionParams.incident.short_description']: [] },
    });
  });

  test(`${SERVICENOW_SIR_CONNECTOR_TYPE_ID}: params validation fails when short_description is not valid`, async () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_SIR_CONNECTOR_TYPE_ID);
    const actionParams = {
      subActionParams: { incident: { short_description: '' }, comments: [] },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        ['subActionParams.incident.short_description']: ['Short description is required.'],
      },
    });
  });
});
