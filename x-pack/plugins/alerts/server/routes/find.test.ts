/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { findAlertRoute } from './find';
import { httpServiceMock } from 'src/core/server/mocks';
import { mockLicenseState } from '../lib/license_state.mock';
import { verifyApiAccess } from '../lib/license_api_access';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { alertsClientMock } from '../alerts_client.mock';

const alertsClient = alertsClientMock.create();

jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('findAlertRoute', () => {
  it('finds alerts with proper parameters', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    findAlertRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/_find"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

    const findResult = {
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    };
    alertsClient.find.mockResolvedValueOnce(findResult);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "data": Array [],
          "page": 1,
          "perPage": 1,
          "total": 0,
        },
      }
    `);

    expect(alertsClient.find).toHaveBeenCalledTimes(1);
    expect(alertsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "options": Object {
            "defaultSearchOperator": "OR",
            "page": 1,
            "perPage": 1,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: findResult,
    });
  });

  it('ensures the license allows finding alerts', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    findAlertRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    alertsClient.find.mockResolvedValueOnce({
      page: 1,
      perPage: 1,
      total: 0,
      data: [],
    });

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents finding alerts', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    findAlertRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        query: {
          per_page: 1,
          page: 1,
          default_search_operator: 'OR',
        },
      },
      ['ok']
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
