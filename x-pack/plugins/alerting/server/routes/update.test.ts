/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockLicenseState } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { updateAlertRoute } from './update';

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('updateAlertRoute', () => {
  it('updates an alert with proper parameters', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    updateAlertRoute(router, licenseState);

    const [config, handler] = router.put.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/{id}"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerts-all",
        ],
      }
    `);

    const updateResult = {
      id: '1',
      alertTypeId: 'my-alert-type-id',
      name: 'My name',
      config: { foo: true },
    };

    const alertsClient = {
      update: jest.fn().mockResolvedValueOnce(updateResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({ body: updateResult });

    expect(alertsClient.update).toHaveBeenCalledTimes(1);
    expect(alertsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "alert": Object {
            "config": Object {
              "foo": true,
            },
            "name": "My name",
            "secrets": Object {
              "key": "i8oh34yf9783y39",
            },
          },
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('ensures the license allows deleting alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    updateAlertRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const updateResult = {
      id: '1',
      alertTypeId: 'my-alert-type-id',
      name: 'My name',
      config: { foo: true },
    };

    const alertsClient = {
      update: jest.fn().mockResolvedValueOnce(updateResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents deleting alerts', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    updateAlertRoute(router, licenseState);

    const [, handler] = router.put.mock.calls[0];

    const updateResult = {
      id: '1',
      alertTypeId: 'my-alert-type-id',
      name: 'My name',
      config: { foo: true },
    };

    const alertsClient = {
      update: jest.fn().mockResolvedValueOnce(updateResult),
    };

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
        body: {
          name: 'My name',
          config: { foo: true },
          secrets: { key: 'i8oh34yf9783y39' },
        },
      },
      ['ok']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
