/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { muteAlertRoute } from './mute_alert';
import { httpServiceMock } from 'src/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { RuleTypeDisabledError } from '../lib/errors/rule_type_disabled';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access.ts', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('muteAlertRoute', () => {
  it('mutes an alert', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    muteAlertRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/api/alerting/rule/{rule_id}/alert/{alert_id}/_mute"`
    );

    rulesClient.muteInstance.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          rule_id: '1',
          alert_id: '2',
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.muteInstance).toHaveBeenCalledTimes(1);
    expect(rulesClient.muteInstance.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "alertId": "1",
          "alertInstanceId": "2",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    muteAlertRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.muteInstance.mockRejectedValue(
      new RuleTypeDisabledError('Fail', 'license_invalid')
    );

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
