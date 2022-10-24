/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { ActionsConfigurationUtilities } from '../actions_config';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import { buildExecutor } from './executor';
import {
  TestSecretsSchema,
  TestConfigSchema,
  TestNoSubActions,
  TestConfig,
  TestSecrets,
  TestExecutor,
} from './mocks';
import { IService } from './types';

describe('Executor', () => {
  const actionId = 'test-action-id';
  const config = { url: 'https://example.com' };
  const secrets = { username: 'elastic', password: 'changeme' };
  const params = { subAction: 'testUrl', subActionParams: { url: 'https://example.com' } };
  let logger: MockedLogger;
  let services: ReturnType<typeof actionsMock.createServices>;
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;

  const createExecutor = (Service: IService<TestConfig, TestSecrets>) => {
    const connector = {
      id: '.test',
      name: 'Test',
      minimumLicenseRequired: 'basic' as const,
      supportedFeatureIds: ['alerting'],
      schema: {
        config: TestConfigSchema,
        secrets: TestSecretsSchema,
      },
      Service,
    };

    return buildExecutor({ configurationUtilities: mockedActionsConfig, logger, connector });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    logger = loggingSystemMock.createLogger();
    services = actionsMock.createServices();
    mockedActionsConfig = actionsConfigMock.create();
  });

  it('should execute correctly', async () => {
    const executor = createExecutor(TestExecutor);

    const res = await executor({
      actionId,
      params: { subAction: 'echo', subActionParams: { id: 'test-id' } },
      config,
      secrets,
      services,
      configurationUtilities: mockedActionsConfig,
      logger,
    });

    expect(res).toEqual({
      actionId: 'test-action-id',
      data: {
        id: 'test-id',
      },
      status: 'ok',
    });
  });

  it('should execute correctly without schema validation', async () => {
    const executor = createExecutor(TestExecutor);

    const res = await executor({
      actionId,
      params: { subAction: 'noSchema', subActionParams: { id: 'test-id' } },
      config,
      secrets,
      services,
      configurationUtilities: mockedActionsConfig,
      logger,
    });

    expect(res).toEqual({
      actionId: 'test-action-id',
      data: {
        id: 'test-id',
      },
      status: 'ok',
    });
  });

  it('should return an empty object if the func returns undefined', async () => {
    const executor = createExecutor(TestExecutor);

    const res = await executor({
      actionId,
      params: { ...params, subAction: 'noData' },
      config,
      secrets,
      services,
      configurationUtilities: mockedActionsConfig,
      logger,
    });

    expect(res).toEqual({
      actionId: 'test-action-id',
      data: {},
      status: 'ok',
    });
  });

  it('should execute a non async function', async () => {
    const executor = createExecutor(TestExecutor);

    const res = await executor({
      actionId,
      params: { ...params, subAction: 'noAsync' },
      config,
      secrets,
      services,
      configurationUtilities: mockedActionsConfig,
      logger,
    });

    expect(res).toEqual({
      actionId: 'test-action-id',
      data: {},
      status: 'ok',
    });
  });

  it('throws if the are not sub actions registered', async () => {
    const executor = createExecutor(TestNoSubActions);

    await expect(async () =>
      executor({
        actionId,
        params,
        config,
        secrets,
        services,
        configurationUtilities: mockedActionsConfig,
        logger,
      })
    ).rejects.toThrowError('You should register at least one subAction for your connector type');
  });

  it('throws if the sub action is not registered', async () => {
    const executor = createExecutor(TestExecutor);

    await expect(async () =>
      executor({
        actionId,
        params: { subAction: 'not-exist', subActionParams: {} },
        config,
        secrets,
        services,
        configurationUtilities: mockedActionsConfig,
        logger,
      })
    ).rejects.toThrowError(
      'Sub action "not-exist" is not registered. Connector id: test-action-id. Connector name: Test. Connector type: .test'
    );
  });

  it('throws if the method does not exists', async () => {
    const executor = createExecutor(TestExecutor);

    await expect(async () =>
      executor({
        actionId,
        params,
        config,
        secrets,
        services,
        configurationUtilities: mockedActionsConfig,
        logger,
      })
    ).rejects.toThrowError(
      'Method "not-exist" does not exists in service. Sub action: "testUrl". Connector id: test-action-id. Connector name: Test. Connector type: .test'
    );
  });

  it('throws if the registered method is not a function', async () => {
    const executor = createExecutor(TestExecutor);

    await expect(async () =>
      executor({
        actionId,
        params: { ...params, subAction: 'notAFunction' },
        config,
        secrets,
        services,
        configurationUtilities: mockedActionsConfig,
        logger,
      })
    ).rejects.toThrowError(
      'Method "notAFunction" must be a function. Connector id: test-action-id. Connector name: Test. Connector type: .test'
    );
  });

  it('throws if the sub actions params are not valid', async () => {
    const executor = createExecutor(TestExecutor);

    await expect(async () =>
      executor({
        actionId,
        params: { ...params, subAction: 'echo' },
        config,
        secrets,
        services,
        configurationUtilities: mockedActionsConfig,
        logger,
      })
    ).rejects.toThrowError(
      'Request validation failed (Error: [id]: expected value of type [string] but got [undefined])'
    );
  });
});
