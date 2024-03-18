/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RulesSettingsClient,
  RulesSettingsClientConstructorOptions,
} from './rules_settings_client';
import { RulesSettingsFlappingClient } from './flapping/rules_settings_flapping_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { RulesSettingsQueryDelayClient } from './query_delay/rules_settings_query_delay_client';

const savedObjectsClient = savedObjectsClientMock.create();

const rulesSettingsClientParams: jest.Mocked<RulesSettingsClientConstructorOptions> = {
  logger: loggingSystemMock.create().get(),
  getUserName: jest.fn(),
  savedObjectsClient,
  isServerless: false,
};

describe('RulesSettingsClient', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  test('can initialize correctly', async () => {
    const client = new RulesSettingsClient(rulesSettingsClientParams);
    expect(client.flapping()).toEqual(expect.any(RulesSettingsFlappingClient));
    expect(client.queryDelay()).toEqual(expect.any(RulesSettingsQueryDelayClient));
  });
});
