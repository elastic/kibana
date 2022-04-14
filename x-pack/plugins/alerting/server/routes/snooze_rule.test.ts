/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { snoozeRuleRoute } from './snooze_rule';
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

// These tests don't test for future snooze time validation, so this date doesn't need to be in the future
const SNOOZE_END_TIME = '2021-03-07T00:00:00.000Z';

describe('snoozeAlertRoute', () => {
  it('snoozes an alert', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_snooze"`);

    rulesClient.snooze.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          snooze_end_time: SNOOZE_END_TIME,
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.snooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.snooze.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "snoozeEndTime": "${SNOOZE_END_TIME}",
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('also snoozes an alert when passed snoozeEndTime of -1', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_snooze"`);

    rulesClient.snooze.mockResolvedValueOnce();

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        body: {
          snooze_end_time: -1,
        },
      },
      ['noContent']
    );

    expect(await handler(context, req, res)).toEqual(undefined);

    expect(rulesClient.snooze).toHaveBeenCalledTimes(1);
    expect(rulesClient.snooze.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "1",
          "snoozeEndTime": -1,
        },
      ]
    `);

    expect(res.noContent).toHaveBeenCalled();
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    snoozeRuleRoute(router, licenseState);

    const [, handler] = router.post.mock.calls[0];

    rulesClient.snooze.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { params: {}, body: {} }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });
});
