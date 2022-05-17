/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
import { ActionTypeModel } from '../../../../types';
import { ServiceNowActionConnector } from './types';
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

describe('servicenow connector validation', () => {
  [
    SERVICENOW_ITSM_ACTION_TYPE_ID,
    SERVICENOW_SIR_ACTION_TYPE_ID,
    SERVICENOW_ITOM_ACTION_TYPE_ID,
  ].forEach((id) => {
    test(`${id}: connector validation succeeds when connector config is valid`, async () => {
      const actionTypeModel = actionTypeRegistry.get(id);
      const actionConnector = {
        secrets: {
          username: 'user',
          password: 'pass',
        },
        id: 'test',
        actionTypeId: id,
        name: 'ServiceNow',
        isPreconfigured: false,
        isDeprecated: false,
        config: {
          isOAuth: false,
          apiUrl: 'https://dev94428.service-now.com/',
          usesTableApi: false,
        },
      } as ServiceNowActionConnector;

      expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
        config: {
          errors: {
            apiUrl: [],
            clientId: [],
            jwtKeyId: [],
            userIdentifierValue: [],
            usesTableApi: [],
          },
        },
        secrets: {
          errors: {
            username: [],
            password: [],
            clientSecret: [],
            privateKey: [],
          },
        },
      });
    });

    test(`${id}: connector validation fails when connector config is not valid`, async () => {
      const actionTypeModel = actionTypeRegistry.get(id);
      const actionConnector = {
        secrets: {
          username: 'user',
        },
        id,
        actionTypeId: id,
        name: 'servicenow',
        config: {},
      } as unknown as ServiceNowActionConnector;

      expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
        config: {
          errors: {
            apiUrl: ['URL is required.'],
            usesTableApi: [],
            clientId: [],
            jwtKeyId: [],
            userIdentifierValue: [],
          },
        },
        secrets: {
          errors: {
            username: [],
            password: ['Password is required.'],
            clientSecret: [],
            privateKey: [],
          },
        },
      });
    });
  });
});

describe('servicenow connector validation for OAuth', () => {
  [
    SERVICENOW_ITSM_ACTION_TYPE_ID,
    SERVICENOW_SIR_ACTION_TYPE_ID,
    SERVICENOW_ITOM_ACTION_TYPE_ID,
  ].forEach((id) => {
    const mockConnector = ({
      actionTypeId = '',
      clientSecret = 'clientSecret',
      privateKey = 'privateKey',
      privateKeyPassword = 'privateKeyPassword',
      isOAuth = true,
      apiUrl = 'https://dev94428.service-now.com/',
      usesTableApi = false,
      clientId = 'clientId',
      jwtKeyId = 'jwtKeyId',
      userIdentifierValue = 'userIdentifierValue',
    }: {
      actionTypeId?: string | null;
      clientSecret?: string | null;
      privateKey?: string | null;
      privateKeyPassword?: string | null;
      isOAuth?: boolean;
      apiUrl?: string | null;
      usesTableApi?: boolean | null;
      clientId?: string | null;
      jwtKeyId?: string | null;
      userIdentifierValue?: string | null;
    }) =>
      ({
        secrets: {
          clientSecret,
          privateKey,
          privateKeyPassword,
        },
        id,
        actionTypeId,
        name: 'servicenow',
        config: {
          isOAuth,
          apiUrl,
          usesTableApi,
          clientId,
          jwtKeyId,
          userIdentifierValue,
        },
      } as unknown as ServiceNowActionConnector);

    test(`${id}: valid OAuth Connector`, async () => {
      const actionTypeModel = actionTypeRegistry.get(id);
      const actionConnector = mockConnector({ actionTypeId: id });

      expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
        config: {
          errors: {
            apiUrl: [],
            usesTableApi: [],
            clientId: [],
            jwtKeyId: [],
            userIdentifierValue: [],
          },
        },
        secrets: {
          errors: {
            username: [],
            password: [],
            clientSecret: [],
            privateKey: [],
          },
        },
      });
    });

    test(`${id}: has invalid fields`, async () => {
      const actionTypeModel = actionTypeRegistry.get(id);
      const actionConnector = mockConnector({
        actionTypeId: id,
        apiUrl: null,
        clientId: null,
        jwtKeyId: null,
        userIdentifierValue: null,
        clientSecret: null,
        privateKey: null,
        privateKeyPassword: null,
      });

      expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
        config: {
          errors: {
            apiUrl: ['URL is required.'],
            usesTableApi: [],
            clientId: ['Client ID is required.'],
            jwtKeyId: ['JWT Verifier Key ID is required.'],
            userIdentifierValue: ['User Identifier is required.'],
          },
        },
        secrets: {
          errors: {
            username: [],
            password: [],
            clientSecret: ['Client Secret is required.'],
            privateKey: ['Private Key is required.'],
          },
        },
      });
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
