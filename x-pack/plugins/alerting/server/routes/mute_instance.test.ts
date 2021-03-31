/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { muteAlertInstanceRoute } from './mute_instance';
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

describe('muteAlertInstanceRoute', () => {
  it('mutes an alert instance', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    muteAlertInstanceRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/api/alerts/alert/{alert_id}/alert_instance/{alert_instance_id}/_mute"`
    );

    alertsClient.muteInstance.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { alertsClient },
      {
        params: {
          alert_id: '1',
          alert_instance_id: '2',
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

  it('ensures the alert type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    muteAlertInstanceRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    alertsClient.muteInstance.mockRejectedValue(
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
