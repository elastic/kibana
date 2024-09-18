/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import {
  rulesSettingsClientMock,
  RulesSettingsClientMock,
} from '../rules_settings/rules_settings_client.mock';
import { updateFlappingSettingsRoute } from './update_flapping_settings';

let rulesSettingsClient: RulesSettingsClientMock;

jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  rulesSettingsClient = rulesSettingsClientMock.create();
});

const mockFlappingSettings = {
  enabled: true,
  lookBackWindow: 10,
  statusChangeThreshold: 10,
  createdBy: 'test name',
  updatedBy: 'test name',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('updateFlappingSettingsRoute', () => {
  test('updates flapping settings', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    updateFlappingSettingsRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/rules/settings/_flapping"`);
    expect(config.options).toMatchInlineSnapshot(`
      Object {
        "tags": Array [
          "access:write-flapping-settings",
        ],
      }
    `);

    (rulesSettingsClient.flapping().get as jest.Mock).mockResolvedValue(mockFlappingSettings);
    (rulesSettingsClient.flapping().update as jest.Mock).mockResolvedValue(mockFlappingSettings);

    const updateResult = {
      enabled: false,
      look_back_window: 6,
      status_change_threshold: 5,
    };

    const [context, req, res] = mockHandlerArguments(
      { rulesSettingsClient },
      {
        body: updateResult,
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesSettingsClient.flapping().update).toHaveBeenCalledTimes(1);
    expect((rulesSettingsClient.flapping().update as jest.Mock).mock.calls[0])
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "enabled": false,
          "lookBackWindow": 6,
          "statusChangeThreshold": 5,
        },
      ]
    `);
    expect(res.ok).toHaveBeenCalledWith({
      body: expect.objectContaining({
        enabled: true,
        look_back_window: 10,
        status_change_threshold: 10,
        created_by: 'test name',
        updated_by: 'test name',
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    });
  });
});
