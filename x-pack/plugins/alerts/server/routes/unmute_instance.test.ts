/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unmuteAlertInstanceRoute } from './unmute_instance';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { alertsClientMock } from '../alerts_client.mock';
import { AlertTypeDisabledError } from '../lib/errors/alert_type_disabled';

const alertsClient = alertsClientMock.create();
jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('unmuteAlertInstanceRoute', () => {
  it('unmutes an alert instance', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    unmuteAlertInstanceRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/api/alerts/alert/{alertId}/alert_instance/{alertInstanceId}/_unmute"`
    );

    alertsClient.unmuteInstance.mockResolvedValueOnce();

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

    expect(alertsClient.unmuteInstance).toHaveBeenCalledTimes(1);
    expect(alertsClient.unmuteInstance.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "alertId": "1",
          "alertInstanceId": "2",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the alert type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    unmuteAlertInstanceRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    alertsClient.unmuteInstance.mockRejectedValue(
      new AlertTypeDisabledError('Fail', 'license_invalid')
    );

    const [context, req, res] = mockHandlerArguments({ alertsClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
