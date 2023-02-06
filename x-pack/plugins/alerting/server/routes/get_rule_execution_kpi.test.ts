/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { rulesClientMock } from '../rules_client.mock';
import { getRuleExecutionKPIRoute } from './get_rule_execution_kpi';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getRuleExecutionKPIRoute', () => {
  const dateString = new Date().toISOString();
  const mockedExecutionLog = {
    success: 3,
    unknown: 0,
    failure: 0,
    warning: 0,
    activeAlerts: 5,
    newAlerts: 5,
    recoveredAlerts: 0,
    erroredActions: 0,
    triggeredActions: 5,
  };

  it('gets rule execution KPI', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleExecutionKPIRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_execution_kpi"`);

    rulesClient.getRuleExecutionKPI.mockResolvedValue(mockedExecutionLog);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        query: {
          date_start: dateString,
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.getRuleExecutionKPI).toHaveBeenCalledTimes(1);
    expect(rulesClient.getRuleExecutionKPI.mock.calls[0]).toEqual([
      {
        dateStart: dateString,
        id: '1',
      },
    ]);

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns NOT-FOUND when rule is not found', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleExecutionKPIRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.getRuleExecutionKPI = jest
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
