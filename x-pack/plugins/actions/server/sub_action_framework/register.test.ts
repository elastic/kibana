/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import {
  TestSecretsSchema,
  TestConfigSchema,
  TestConfig,
  TestSecrets,
  TestSubActionConnector,
} from './mocks';
import { register } from './register';

describe('Registration', () => {
  const connector = {
    id: '.test',
    name: 'Test',
    minimumLicenseRequired: 'basic' as const,
    schema: {
      config: TestConfigSchema,
      secrets: TestSecretsSchema,
    },
    Service: TestSubActionConnector,
  };

  const actionTypeRegistry = actionTypeRegistryMock.create();
  const mockedActionsConfig = actionsConfigMock.create();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it('registers the connector correctly', async () => {
    register<TestConfig, TestSecrets>({
      actionTypeRegistry,
      connector,
      configurationUtilities: mockedActionsConfig,
      logger,
    });

    expect(actionTypeRegistry.register).toHaveBeenCalledTimes(1);
    expect(actionTypeRegistry.register).toHaveBeenCalledWith({
      id: connector.id,
      name: connector.name,
      minimumLicenseRequired: connector.minimumLicenseRequired,
      validate: expect.anything(),
      executor: expect.anything(),
    });
  });
});
