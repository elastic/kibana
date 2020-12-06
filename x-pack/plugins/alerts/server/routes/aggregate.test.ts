/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { aggregateAlertRoute } from './aggregate';
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

describe('aggregateAlertRoute', () => {
  it('aggregate alerts with proper parameters', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    aggregateAlertRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerts/_aggregate"`);

    const aggregateResult = {
      alertExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
    };
    alertsClient.aggregate.mockResolvedValueOnce(aggregateResult);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        query: {
          default_search_operator: 'AND',
        },
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "alertExecutionStatus": Object {
            "active": 23,
            "error": 2,
            "ok": 15,
            "pending": 1,
            "unknown": 0,
          },
        },
      }
    `);

    expect(alertsClient.aggregate).toHaveBeenCalledTimes(1);
    expect(alertsClient.aggregate.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "options": Object {
            "defaultSearchOperator": "AND",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: aggregateResult,
    });
  });

  it('ensures the license allows aggregating alerts', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    aggregateAlertRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    alertsClient.aggregate.mockResolvedValueOnce({
      alertExecutionStatus: {
        ok: 15,
        error: 2,
        active: 23,
        pending: 1,
        unknown: 0,
      },
    });

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        query: {
          default_search_operator: 'OR',
        },
      }
    );

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents aggregating alerts', async () => {
    const licenseState = mockLicenseState();
    const router = httpServiceMock.createRouter();

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    aggregateAlertRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    const [context, req, res] = mockHandlerArguments(
      {},
      {
        query: {},
      },
      ['ok']
    );
    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });
});
