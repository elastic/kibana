/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { getGlobalExecutionKPIRoute } from './get_global_execution_kpi';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getGlobalExecutionKPIRoute', () => {
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

  it('gets global execution KPI', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getGlobalExecutionKPIRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/_global_execution_kpi"`);

    rulesClient.getGlobalExecutionKpiWithAuth.mockResolvedValue(mockedExecutionLog);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          date_start: dateString,
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.getGlobalExecutionKpiWithAuth).toHaveBeenCalledTimes(1);
    expect(rulesClient.getGlobalExecutionKpiWithAuth.mock.calls[0]).toEqual([
      {
        dateStart: dateString,
      },
    ]);

    expect(res.ok).toHaveBeenCalled();
  });
});
