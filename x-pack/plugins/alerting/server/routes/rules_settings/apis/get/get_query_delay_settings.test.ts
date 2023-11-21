/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import {
  rulesSettingsClientMock,
  RulesSettingsClientMock,
} from '../../../../rules_settings_client.mock';
import { getQueryDelaySettingsRoute } from './get_query_delay_settings';

let rulesSettingsClient: RulesSettingsClientMock;

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  rulesSettingsClient = rulesSettingsClientMock.create();
});

describe('getQueryDelaySettingsRoute', () => {
  test('gets query delay settings', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getQueryDelaySettingsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config).toMatchInlineSnapshot(`
      Object {
        "options": Object {
          "tags": Array [
            "access:read-query-delay-settings",
          ],
        },
        "path": "/internal/alerting/rules/settings/_query_delay",
        "validate": Object {},
      }
    `);

    (rulesSettingsClient.queryDelay().get as jest.Mock).mockResolvedValue({
      delay: 10,
      createdBy: 'test name',
      updatedBy: 'test name',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const [context, req, res] = mockHandlerArguments({ rulesSettingsClient }, {}, ['ok']);

    await handler(context, req, res);

    expect(rulesSettingsClient.queryDelay().get).toHaveBeenCalledTimes(1);
    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        delay: 10,
        created_by: 'test name',
        updated_by: 'test name',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    });
  });
});
