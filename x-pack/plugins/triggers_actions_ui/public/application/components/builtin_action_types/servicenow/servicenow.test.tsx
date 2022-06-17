/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { registrationServicesMock } from '../../../../mocks';

const SERVICENOW_ITSM_ACTION_TYPE_ID = '.servicenow';
const SERVICENOW_SIR_ACTION_TYPE_ID = '.servicenow-sir';
const SERVICENOW_ITOM_ACTION_TYPE_ID = '.servicenow-itom';
let actionTypeRegistry: TypeRegistry<ActionTypeModel>;

beforeAll(() => {
  actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry, services: registrationServicesMock });
});

describe('actionTypeRegistry.get() works', () => {
  [
    SERVICENOW_ITSM_ACTION_TYPE_ID,
    SERVICENOW_SIR_ACTION_TYPE_ID,
    SERVICENOW_ITOM_ACTION_TYPE_ID,
  ].forEach((id) => {
    test(`${id}: action type static data is as expected`, () => {
      const actionTypeModel = actionTypeRegistry.get(id);
      expect(actionTypeModel.id).toEqual(id);
    });
  });
});

describe('servicenow action params validation', () => {
  [SERVICENOW_ITSM_ACTION_TYPE_ID, SERVICENOW_SIR_ACTION_TYPE_ID].forEach((id) => {
    test(`${id}: action params validation succeeds when action params is valid`, async () => {
      const actionTypeModel = actionTypeRegistry.get(id);
      const actionParams = {
        subActionParams: { incident: { short_description: 'some title {{test}}' }, comments: [] },
      };

      expect(await actionTypeModel.validateParams(actionParams)).toEqual({
        errors: { ['subActionParams.incident.short_description']: [] },
      });
    });

    test(`${id}: params validation fails when short_description is not valid`, async () => {
      const actionTypeModel = actionTypeRegistry.get(id);
      const actionParams = {
        subActionParams: { incident: { short_description: '' }, comments: [] },
      };

      expect(await actionTypeModel.validateParams(actionParams)).toEqual({
        errors: {
          ['subActionParams.incident.short_description']: ['Short description is required.'],
        },
      });
    });
  });

  test(`${SERVICENOW_ITOM_ACTION_TYPE_ID}: action params validation succeeds when action params is valid`, async () => {
    const actionTypeModel = actionTypeRegistry.get(SERVICENOW_ITOM_ACTION_TYPE_ID);
    const actionParams = { subActionParams: { severity: 'Critical' } };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { ['severity']: [] },
    });
  });

  test(`${SERVICENOW_ITOM_ACTION_TYPE_ID}: params validation fails when severity is not valid`, async () => {
    const actionTypeModel = actionTypeRegistry.get(SERVICENOW_ITOM_ACTION_TYPE_ID);
    const actionParams = { subActionParams: { severity: null } };

    expect(await actionTypeModel.validateParams(actionParams)).toEqual({
      errors: { ['severity']: ['Severity is required.'] },
    });
  });
});
