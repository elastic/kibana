/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleAlertSummaryRoute } from './get_rule_alert_summary';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { rulesClientMock } from '../rules_client.mock';
import { AlertSummary } from '../types';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getRuleAlertSummaryRoute', () => {
  const dateString = new Date().toISOString();
  const mockedAlertSummary: AlertSummary = {
    id: '',
    name: '',
    tags: [],
    ruleTypeId: '',
    consumer: '',
    muteAll: false,
    throttle: null,
    enabled: false,
    statusStartDate: dateString,
    statusEndDate: dateString,
    status: 'OK',
    errorMessages: [],
    alerts: {},
    executionDuration: {
      average: 1,
      valuesWithTimestamp: {
        '17 Nov 2021 @ 19:19:17': 3,
        '18 Nov 2021 @ 19:19:17': 5,
        '19 Nov 2021 @ 19:19:17': 5,
      },
    },
  };

  it('gets rule alert summary', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleAlertSummaryRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_alert_summary"`);

    rulesClient.getAlertSummary.mockResolvedValueOnce(mockedAlertSummary);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        query: {},
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.getAlertSummary).toHaveBeenCalledTimes(1);
    expect(rulesClient.getAlertSummary.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "dateStart": undefined,
          "id": "1",
          "numberOfExecutions": undefined,
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns NOT-FOUND when rule is not found', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleAlertSummaryRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.getAlertSummary = jest
      .fn()
      .mockRejectedValueOnce(SavedObjectsErrorHelpers.createGenericNotFoundError('alert', '1'));

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        query: {},
      },
      ['notFound']
    );

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(
      `[Error: Saved object [alert/1] not found]`
    );
  });
});
