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

const SERVICENOW_ITOM_CONNECTOR_TYPE_ID = '.servicenow-itom';
let connectorTypeRegistry: TypeRegistry<ConnectorTypeModel>;

beforeAll(() => {
  connectorTypeRegistry = new TypeRegistry<ConnectorTypeModel>();
  registerConnectorTypes({ connectorTypeRegistry, services: registrationServicesMock });
});

describe('connectorTypeRegistry.get() works', () => {
  test(`${SERVICENOW_ITOM_CONNECTOR_TYPE_ID}: connector type static data is as expected`, () => {
    const connectorTypeModel = connectorTypeRegistry.get(SERVICENOW_ITOM_CONNECTOR_TYPE_ID);
    expect(connectorTypeModel.id).toEqual(SERVICENOW_ITOM_CONNECTOR_TYPE_ID);
  });
});

describe('servicenow action params validation', () => {
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
