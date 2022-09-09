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

const SERVICENOW_ITSM_CONNECTOR_TYPE_ID = '.servicenow';
const SERVICENOW_SIR_CONNECTOR_TYPE_ID = '.servicenow-sir';
const SERVICENOW_ITOM_CONNECTOR_TYPE_ID = '.servicenow-itom';
let connectorTypeRegistry: TypeRegistry<ConnectorTypeModel>;

beforeAll(() => {
  connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
});

describe('connectorTypeRegistry.get() works', () => {
  [
    SERVICENOW_ITSM_CONNECTOR_TYPE_ID,
    SERVICENOW_SIR_CONNECTOR_TYPE_ID,
    SERVICENOW_ITOM_CONNECTOR_TYPE_ID,
  ].forEach((id) => {
    test(`${id}: connector type static data is as expected`, () => {
      const connectorTypeModel = connectorTypeRegistry.get(id);
      expect(connectorTypeModel.id).toEqual(id);
    });
  });
});

describe('servicenow action params validation', () => {
  [SERVICENOW_ITSM_CONNECTOR_TYPE_ID, SERVICENOW_SIR_CONNECTOR_TYPE_ID].forEach((id) => {
    test(`${id}: action params validation succeeds when action params is valid`, async () => {
      const connectorTypeModel = connectorTypeRegistry.get(id);
      const actionParams = {
        subActionParams: { incident: { short_description: 'some title {{test}}' }, comments: [] },
      };

      expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
        errors: { ['subActionParams.incident.short_description']: [] },
      });
    });

    test(`${id}: params validation fails when short_description is not valid`, async () => {
      const connectorTypeModel = connectorTypeRegistry.get(id);
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

  test(`${SERVICENOW_ITOM_CONNECTOR_TYPE_ID}: action params validation succeeds when action params is valid`, async () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_ITOM_CONNECTOR_TYPE_ID);
    const actionParams = { subActionParams: { severity: 'Critical' } };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { ['severity']: [] },
    });
  });

  test(`${SERVICENOW_ITOM_CONNECTOR_TYPE_ID}: params validation fails when severity is not valid`, async () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_ITOM_CONNECTOR_TYPE_ID);
    const actionParams = { subActionParams: { severity: null } };

    expect(await connectorTypeModel.validateParams(actionParams)).toEqual({
      errors: { ['severity']: ['Severity is required.'] },
    });
  });
});
