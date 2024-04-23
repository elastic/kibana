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
import { ServiceParams } from './types';

describe('Registration', () => {
  const renderedVariables = { body: '' };
  const mockRenderParameterTemplates = jest.fn().mockReturnValue(renderedVariables);

  const connector = {
    id: '.test',
    name: 'Test',
    minimumLicenseRequired: 'basic' as const,
    supportedFeatureIds: ['alerting'],
    schema: {
      config: TestConfigSchema,
      secrets: TestSecretsSchema,
    },
    getService: (serviceParams: ServiceParams<TestConfig, TestSecrets>) =>
      new TestSubActionConnector(serviceParams),
    renderParameterTemplates: mockRenderParameterTemplates,
  };

  const actionTypeRegistry = actionTypeRegistryMock.create();
  const mockedActionsConfig = actionsConfigMock.create();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
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
      supportedFeatureIds: connector.supportedFeatureIds,
      validate: expect.anything(),
      executor: expect.any(Function),
      getService: expect.any(Function),
      renderParameterTemplates: expect.any(Function),
    });
  });

  it('registers the renderParameterTemplates correctly', async () => {
    register<TestConfig, TestSecrets>({
      actionTypeRegistry,
      connector,
      configurationUtilities: mockedActionsConfig,
      logger,
    });

    const params = {};
    const variables = {};
    const actionId = 'action-id';

    const { renderParameterTemplates } = actionTypeRegistry.register.mock.calls[0][0];
    const rendered = renderParameterTemplates?.(logger, params, variables, actionId);

    expect(mockRenderParameterTemplates).toHaveBeenCalledWith(logger, params, variables, actionId);
    expect(rendered).toBe(renderedVariables);
  });

  it('registers a system connector correctly', async () => {
    register<TestConfig, TestSecrets>({
      actionTypeRegistry,
      connector: { ...connector, isSystemActionType: true },
      configurationUtilities: mockedActionsConfig,
      logger,
    });

    expect(actionTypeRegistry.register).toHaveBeenCalledTimes(1);
    expect(actionTypeRegistry.register).toHaveBeenCalledWith({
      id: connector.id,
      name: connector.name,
      minimumLicenseRequired: connector.minimumLicenseRequired,
      supportedFeatureIds: connector.supportedFeatureIds,
      validate: expect.anything(),
      executor: expect.any(Function),
      getService: expect.any(Function),
      renderParameterTemplates: expect.any(Function),
      isSystemActionType: true,
    });
  });

  it('add support for setting the kibana privileges for system connectors', async () => {
    const getKibanaPrivileges = () => ['my-privilege'];

    register<TestConfig, TestSecrets>({
      actionTypeRegistry,
      connector: {
        ...connector,
        isSystemActionType: true,
        getKibanaPrivileges,
      },
      configurationUtilities: mockedActionsConfig,
      logger,
    });

    expect(actionTypeRegistry.register).toHaveBeenCalledTimes(1);
    expect(actionTypeRegistry.register).toHaveBeenCalledWith({
      id: connector.id,
      name: connector.name,
      minimumLicenseRequired: connector.minimumLicenseRequired,
      supportedFeatureIds: connector.supportedFeatureIds,
      validate: expect.anything(),
      executor: expect.any(Function),
      getService: expect.any(Function),
      renderParameterTemplates: expect.any(Function),
      isSystemActionType: true,
      getKibanaPrivileges,
    });
  });
});
