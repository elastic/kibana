/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleExecutionLogRoute } from './get_rule_execution_log';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { rulesClientMock } from '../rules_client.mock';
import { IExecutionLogWithErrorsResult } from '../../common';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getRuleExecutionLogRoute', () => {
  const dateString = new Date().toISOString();
  const mockedExecutionLogWithErrors: IExecutionLogWithErrorsResult = {
    total: 374,
    data: [
      {
        id: '6705da7d-2635-499d-a6a8-1aee1ae1eac9',
        timestamp: '2022-03-07T15:38:32.617Z',
        duration_ms: 1056,
        status: 'success',
        message:
          "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
        num_active_alerts: 5,
        num_new_alerts: 5,
        num_recovered_alerts: 0,
        num_triggered_actions: 5,
        num_generated_actions: 5,
        num_succeeded_actions: 5,
        num_errored_actions: 0,
        total_search_duration_ms: 0,
        es_search_duration_ms: 0,
        timed_out: false,
        schedule_delay_ms: 3126,
      },
      {
        id: '41b2755e-765a-4044-9745-b03875d5e79a',
        timestamp: '2022-03-07T15:39:05.604Z',
        duration_ms: 1165,
        status: 'success',
        message:
          "rule executed: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule'",
        num_active_alerts: 5,
        num_new_alerts: 5,
        num_recovered_alerts: 5,
        num_triggered_actions: 5,
        num_generated_actions: 5,
        num_succeeded_actions: 5,
        num_errored_actions: 0,
        total_search_duration_ms: 0,
        es_search_duration_ms: 0,
        timed_out: false,
        schedule_delay_ms: 3008,
      },
    ],
    totalErrors: 2,
    errors: [
      {
        id: '08d9b0f5-0b41-47c9-951f-a666b5788ddc',
        timestamp: '2022-03-23T17:37:07.086Z',
        type: 'actions',
        message:
          'action execution failure: .server-log:9e67b8b0-9e2c-11ec-bd64-774ed95c43ef: s - an error occurred while running the action executor: something funky with the server log',
      },
      {
        id: 'c1c04f04-312e-4e23-8e36-e01eb4332ed6',
        timestamp: '2022-03-23T17:23:05.249Z',
        type: 'alerting',
        message: `rule execution failure: example.always-firing:a348a740-9e2c-11ec-bd64-774ed95c43ef: 'test rule' - I am erroring in rule execution!!`,
      },
    ],
  };

  it('gets rule execution log', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleExecutionLogRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_execution_log"`);

    rulesClient.getExecutionLogForRule.mockResolvedValue(mockedExecutionLogWithErrors);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: {
          id: '1',
        },
        query: {
          date_start: dateString,
          per_page: 10,
          page: 1,
          sort: [{ timestamp: { order: 'desc' } }],
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.getExecutionLogForRule).toHaveBeenCalledTimes(1);
    expect(rulesClient.getExecutionLogForRule.mock.calls[0]).toEqual([
      {
        dateStart: dateString,
        id: '1',
        page: 1,
        perPage: 10,
        sort: [{ timestamp: { order: 'desc' } }],
      },
    ]);

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns NOT-FOUND when rule is not found', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getRuleExecutionLogRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.getExecutionLogForRule = jest
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
