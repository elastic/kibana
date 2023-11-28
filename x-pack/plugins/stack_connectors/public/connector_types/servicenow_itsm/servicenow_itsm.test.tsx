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

const SERVICENOW_ITSM_CONNECTOR_TYPE_ID = '.servicenow';
let connectorTypeRegistry: TypeRegistry<ConnectorTypeModel>;

beforeAll(() => {
  connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  ExperimentalFeaturesService.init({ experimentalFeatures: experimentalFeaturesMock });
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
});

describe('connectorTypeRegistry.get() works', () => {
  test(`${SERVICENOW_ITSM_CONNECTOR_TYPE_ID}: connector type static data is as expected`, () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_ITSM_CONNECTOR_TYPE_ID);
    expect(connectorTypeModel.id).toEqual(SERVICENOW_ITSM_CONNECTOR_TYPE_ID);
  });
});

describe('servicenow action params validation', () => {
  test(`${SERVICENOW_ITSM_CONNECTOR_TYPE_ID}: action params validation succeeds when action params is valid`, async () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_ITSM_CONNECTOR_TYPE_ID);
    const actionParams = {
      subActionParams: { incident: { short_description: 'some title {{test}}' }, comments: [] },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        ['subActionParams.incident.correlation_id']: [],
        ['subActionParams.incident.short_description']: [],
      },
    });
  });

  test(`${SERVICENOW_ITSM_CONNECTOR_TYPE_ID}: action params validation succeeds for closeIncident subAction`, async () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_ITSM_CONNECTOR_TYPE_ID);
    const actionParams = {
      subAction: 'closeIncident',
      subActionParams: { incident: { correlation_id: '{{test}}{{rule_id}}' } },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        ['subActionParams.incident.correlation_id']: [],
        ['subActionParams.incident.short_description']: [],
      },
    });
  });

  test(`${SERVICENOW_ITSM_CONNECTOR_TYPE_ID}: params validation fails when short_description is not valid`, async () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_ITSM_CONNECTOR_TYPE_ID);
    const actionParams = {
      subActionParams: { incident: { short_description: '' }, comments: [] },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        ['subActionParams.incident.correlation_id']: [],
        ['subActionParams.incident.short_description']: ['Short description is required.'],
      },
    });
  });

  test(`${SERVICENOW_ITSM_CONNECTOR_TYPE_ID}: params validation fails when correlation_id is not valid and subAction is closeIncident`, async () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_ITSM_CONNECTOR_TYPE_ID);
    const actionParams = {
      subAction: 'closeIncident',
      subActionParams: { incident: { correlation_id: '' } },
    };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        ['subActionParams.incident.correlation_id']: ['Correlation id is required.'],
        ['subActionParams.incident.short_description']: [],
      },
    });
  });
});
