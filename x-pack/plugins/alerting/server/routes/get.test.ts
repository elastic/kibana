/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockLicenseState } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { getAlertRoute } from './get';

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getAlertRoute', () => {
  it('gets an alert with proper parameters', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getAlertRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/{id}"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerts-read",
        ],
      }
    `);

    const getResult = {
      id: '1',
      alertTypeId: '2',
      name: 'alert name',
      config: {},
    };
    const alertsClient = {
      get: jest.fn().mockResolvedValueOnce(getResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "alertTypeId": "2",
          "config": Object {},
          "id": "1",
          "name": "alert name",
        },
      }
    `);

    expect(alertsClient.get).toHaveBeenCalledTimes(1);
    expect(alertsClient.get.mock.calls[0][0].id).toEqual('1');

    expect(res.ok).toHaveBeenCalledWith({
      body: getResult,
    });
  });

  it('ensures the license allows getting alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getAlertRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const alertsClient = {
      get: jest.fn().mockResolvedValueOnce({
        id: '1',
        alertTypeId: '2',
        name: 'alert name',
        config: {},
      }),
    };

    const [context, req, res] = mockHandlerArguments(
      alertsClient,
      {
        params: { id: '1' },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents getting alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    getAlertRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const alertsClient = {
      get: jest.fn().mockResolvedValueOnce({
        id: '1',
        alertTypeId: '2',
        name: 'alert name',
        config: {},
      }),
    };

    const [context, req, res] = mockHandlerArguments(
      alertsClient,
      {
        params: { id: '1' },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
