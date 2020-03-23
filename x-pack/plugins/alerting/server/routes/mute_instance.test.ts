/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { muteAlertInstanceRoute } from './mute_instance';
import { mockRouter, RouterMock } from '../../../../../src/core/server/http/router/router.mock';
import { mockLicenseState } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { alertsClientMock } from '../alerts_client.mock';

const alertsClient = alertsClientMock.create();
jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('muteAlertInstanceRoute', () => {
  it('mutes an alert instance', async () => {
    const licenseState = mockLicenseState();
    const router: RouterMock = mockRouter.create();

    muteAlertInstanceRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/api/alert/{alertId}/alert_instance/{alertInstanceId}/_mute"`
    );
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:alerting-all",
        ],
      }
    `);

    alertsClient.muteInstance.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          alertId: '1',
          alertInstanceId: '2',
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(alertsClient.muteInstance).toHaveBeenCalledTimes(1);
    expect(alertsClient.muteInstance.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "alertId": "1",
          "alertInstanceId": "2",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });
});
