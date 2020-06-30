/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { listAlertTypesRoute } from './list_alert_types';
import { httpServiceMock } from 'src/core/server/mocks';
import { mockLicenseState } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('listAlertTypesRoute', () => {
  it('lists alert types with proper parameters', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    listAlertTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/list_alert_types"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

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
        actionVariables: [],
        producer: 'test',
      },
    ];

    const [context, req, res] = mockHandlerArguments({ listTypes }, {}, ['ok']);

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
            "actionVariables": Array [],
            "defaultActionGroupId": "default",
            "id": "1",
            "name": "name",
            "producer": "test",
          },
        ],
      }
    `);

    expect(context.alerting!.listTypes).toHaveBeenCalledTimes(1);

    expect(res.ok).toHaveBeenCalledWith({
      body: listTypes,
    });
  });

  it('ensures the license allows listing alert types', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    listAlertTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/list_alert_types"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

    const listTypes = [
      {
        id: '1',
        name: 'name',
        enabled: true,
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        actionVariables: [],
        producer: 'alerting',
      },
    ];

    const [context, req, res] = mockHandlerArguments(
      { listTypes },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents listing alert types', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    listAlertTypesRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/list_alert_types"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

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
        actionVariables: [],
        producer: 'alerting',
      },
    ];

    const [context, req, res] = mockHandlerArguments(
      { listTypes },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
