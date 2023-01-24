/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getActionErrorLogRoute } from './get_action_error_log';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { rulesClientMock } from '../rules_client.mock';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getActionErrorLogRoute', () => {
  const dateString = new Date().toISOString();
  const mockResponse = {
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

  it('gets action error log', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getActionErrorLogRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rule/{id}/_action_error_log"`);

    rulesClient.getActionErrorLog.mockResolvedValue(mockResponse);

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
          filter: 'message: "test"',
          sort: [{ sort_field: '@timestamp', sort_order: 'asc' }],
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.getActionErrorLog).toHaveBeenCalledTimes(1);
    expect(rulesClient.getActionErrorLog.mock.calls[0]).toEqual([
      {
        dateStart: dateString,
        dateEnd: undefined,
        filter: 'message: "test"',
        id: '1',
        page: 1,
        perPage: 10,
        sort: [{ sort_field: '@timestamp', sort_order: 'asc' }],
      },
    ]);

    expect(res.ok).toHaveBeenCalled();
  });

  it('returns NOT-FOUND when rule and rule run is not found', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getActionErrorLogRoute(router, licenseState);

    const [, handler] = router.get.mock.calls[0];

    rulesClient.getActionErrorLog = jest
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
