/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGlobalExecutionLogRoute } from './get_global_execution_logs';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './legacy/_mock_handler_arguments';
import { actionsClientMock } from '../actions_client/actions_client.mock';
import { IExecutionLogResult } from '../../common';
import { verifyAccessAndContext } from './verify_access_and_context';

const actionsClient = actionsClientMock.create();
jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));
beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('getRuleExecutionLogRoute', () => {
  const dateString = new Date().toISOString();
  const mockedExecutionLog: IExecutionLogResult = {
    data: [
      {
        connector_name: 'test connector',
        connector_id: '1',
        duration_ms: 1,
        id: '8b3af07e-7593-4c40-b704-9c06d3b06e58',
        message:
          'action executed: .server-log:6709f660-8d11-11ed-bae5-bd32cbc9eaaa: test connector',
        schedule_delay_ms: 2783,
        space_ids: ['default'],
        status: 'success',
        timestamp: '2023-01-05T15:55:50.495Z',
        version: '8.7.0',
        timed_out: false,
        source: 'SAVED_OBJECT',
      },
    ],
    total: 1,
  };

  it('gets global execution logs', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getGlobalExecutionLogRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/actions/_global_connector_execution_logs"`
    );

    actionsClient.getGlobalExecutionLogWithAuth.mockResolvedValue(mockedExecutionLog);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {
          date_start: dateString,
          per_page: 10,
          page: 1,
          sort: [{ timestamp: { order: 'desc' } }],
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(actionsClient.getGlobalExecutionLogWithAuth).toHaveBeenCalledTimes(1);
    expect(actionsClient.getGlobalExecutionLogWithAuth.mock.calls[0]).toEqual([
      {
        dateStart: dateString,
        page: 1,
        perPage: 10,
        sort: [{ timestamp: { order: 'desc' } }],
      },
    ]);

    expect(res.ok).toHaveBeenCalled();
  });
});
