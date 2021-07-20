/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleTypesRoute } from './rule_types';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { alertsClientMock } from '../alerts_client.mock';
import { RecoveredActionGroup } from '../../common';
import { RegistryAlertTypeWithAuth } from '../authorization';
import { AsApiContract } from './lib';

const alertsClient = alertsClientMock.create();

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('ruleTypesRoute', () => {
  it('lists rule types with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    ruleTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        authorizedConsumers: {},
        actionVariables: {
          context: [],
          state: [],
        },
        producer: 'test',
        enabledInLicense: true,
      } as RegistryAlertTypeWithAuth,
    ];
    const expectedResult: Array<AsApiContract<RegistryAlertTypeWithAuth>> = [
      {
        id: '1',
        name: 'name',
        action_groups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        default_action_group_id: 'default',
        minimum_license_required: 'basic',
        is_exportable: true,
        recovery_action_group: RecoveredActionGroup,
        authorized_consumers: {},
        action_variables: {
          context: [],
          state: [],
        },
        producer: 'test',
        enabled_in_license: true,
      },
    ];
    alertsClient.listAlertTypes.mockResolvedValueOnce(new Set(listTypes));

    const [context, req, res] = mockHandlerArguments({ alertsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "action_groups": Array [
              Object {
                "id": "default",
                "name": "Default",
              },
            ],
            "action_variables": Object {
              "context": Array [],
              "state": Array [],
            },
            "authorized_consumers": Object {},
            "default_action_group_id": "default",
            "enabled_in_license": true,
            "id": "1",
            "is_exportable": true,
            "minimum_license_required": "basic",
            "name": "name",
            "producer": "test",
            "recovery_action_group": Object {
              "id": "recovered",
              "name": "Recovered",
            },
          },
        ],
      }
    `);

    expect(alertsClient.listAlertTypes).toHaveBeenCalledTimes(1);

    expect(res.ok).toHaveBeenCalledWith({
      body: expectedResult,
    });
  });

  it('ensures the license allows listing rule types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    ruleTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        authorizedConsumers: {},
        actionVariables: {
          context: [],
          state: [],
        },
        producer: 'alerts',
        enabledInLicense: true,
      } as RegistryAlertTypeWithAuth,
    ];

    alertsClient.listAlertTypes.mockResolvedValueOnce(new Set(listTypes));

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents listing rule types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    ruleTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule_types"`);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        authorizedConsumers: {},
        actionVariables: {
          context: [],
          state: [],
        },
        producer: 'alerts',
        enabledInLicense: true,
      } as RegistryAlertTypeWithAuth,
    ];

    alertsClient.listAlertTypes.mockResolvedValueOnce(new Set(listTypes));

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
