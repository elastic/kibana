/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listAlertTypesRoute } from './list_alert_types';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { alertsClientMock } from '../alerts_client.mock';
import { RecoveredActionGroup } from '../../common';
import { RegistryAlertTypeWithAuth } from '../authorization';

const alertsClient = alertsClientMock.create();

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('listAlertTypesRoute', () => {
  it('lists alert types with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listAlertTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/list_alert_types"`);

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
    alertsClient.listAlertTypes.mockResolvedValueOnce(new Set(listTypes));

    const [context, req, res] = mockHandlerArguments({ alertsClient }, {}, ['ok']);

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Array [
          Object {
            "actionGroups": Array [
              Object {
                "id": "default",
                "name": "Default",
              },
            ],
            "actionVariables": Object {
              "context": Array [],
              "state": Array [],
            },
            "authorizedConsumers": Object {},
            "defaultActionGroupId": "default",
            "enabledInLicense": true,
            "id": "1",
            "minimumLicenseRequired": "basic",
            "name": "name",
            "producer": "test",
            "recoveryActionGroup": Object {
              "id": "recovered",
              "name": "Recovered",
            },
          },
        ],
      }
    `);

    expect(alertsClient.listAlertTypes).toHaveBeenCalledTimes(1);

    expect(res.ok).toHaveBeenCalledWith({
      body: listTypes,
    });
  });

  it('ensures the license allows listing alert types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    listAlertTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/list_alert_types"`);

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

  it('ensures the license check prevents listing alert types', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    listAlertTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/list_alert_types"`);

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
