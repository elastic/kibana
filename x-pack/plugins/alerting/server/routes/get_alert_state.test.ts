/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAlertStateRoute } from './get_alert_state';
import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockLicenseState } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { SavedObjectsErrorHelpers } from 'src/core/server/saved_objects';
import { alertsClientMock } from '../alerts_client.mock';

const alertsClient = alertsClientMock.create();
jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getAlertStateRoute', () => {
  const mockedAlertState = {
    alertTypeState: {
      some: 'value',
    },
    alertInstances: {
      first_instance: {
        state: {},
        meta: {
          lastScheduledActions: {
            group: 'first_group',
            date: new Date(),
          },
        },
      },
      second_instance: {},
    },
  };

  it('gets alert state', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getAlertStateRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/{id}/state"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

    alertsClient.getAlertState.mockResolvedValueOnce(mockedAlertState);

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(alertsClient.getAlertState).toHaveBeenCalledTimes(1);
    expect(alertsClient.getAlertState.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns NO-CONTENT when alert exists but has no task state yet', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getAlertStateRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/{id}/state"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

    alertsClient.getAlertState.mockResolvedValueOnce(undefined);

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

    expect(alertsClient.getAlertState).toHaveBeenCalledTimes(1);
    expect(alertsClient.getAlertState.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('returns NOT-FOUND when alert is not found', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    getAlertStateRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alert/{id}/state"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-read",
        ],
      }
    `);

    alertsClient.getAlertState = jest
      .fn()
      .mockResolvedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError('alert', '1'));

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          id: '1',
        },
      },
      ['notFound']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(alertsClient.getAlertState).toHaveBeenCalledTimes(1);
    expect(alertsClient.getAlertState.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
        },
      ]
    `);
  });
});
