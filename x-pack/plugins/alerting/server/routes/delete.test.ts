/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockLicenseState } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { deleteAlertRoute } from './delete';

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('deleteAlertRoute', () => {
  it('deletes an alert with proper parameters', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    deleteAlertRoute(router, licenseState);

    const [config, handler] = router.delete.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/{id}"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerts-all",
        ],
      }
    `);

    const alertsClient = {
      delete: jest.fn().mockResolvedValueOnce({}),
    };

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(alertsClient.delete).toHaveBeenCalledTimes(1);
    expect(alertsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the license allows deleting alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    deleteAlertRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    const alertsClient = {
      delete: jest.fn().mockResolvedValueOnce({}),
    };

    const [context, req, res] = mockHandlerArguments(alertsClient, {
      params: { id: '1' },
    });

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents deleting alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    deleteAlertRoute(router, licenseState);

    const [, handler] = router.delete.mock.calls[0];

    const alertsClient = {
      delete: jest.fn().mockResolvedValueOnce({}),
    };

    const [context, req, res] = mockHandlerArguments(alertsClient, {
      id: '1',
    });

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
