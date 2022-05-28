/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath, Logger } from '@kbn/core/server';
import { of } from 'rxjs';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import { PluginSetupContract as AlertingPluginSetupContract } from '@kbn/alerting-plugin/server';
import { APMConfig, APM_SERVER_FEATURE_ID } from '../../..';

export const createRuleTypeMocks = () => {
  let alertExecutor: (...args: any[]) => Promise<any>;

  const mockedConfig$ = of({
    indices: {
      error: 'apm-*',
      transaction: 'apm-*',
    },
  } as APMConfig);

  const loggerMock = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const alerting = {
    registerType: ({ executor }) => {
      alertExecutor = executor;
    },
  } as AlertingPluginSetupContract;

  const scheduleActions = jest.fn();

  const services = {
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    savedObjectsClient: {
      get: () => ({ attributes: { consumer: APM_SERVER_FEATURE_ID } }),
    },
    alertFactory: { create: jest.fn(() => ({ scheduleActions })), done: {} },
    alertWithLifecycle: jest.fn(),
    logger: loggerMock,
    shouldWriteAlerts: () => true,
  };

  return {
    dependencies: {
      alerting,
      config$: mockedConfig$,
      logger: loggerMock,
      ruleDataClient: ruleRegistryMocks.createRuleDataClient(
        '.alerts-observability.apm.alerts'
      ) as IRuleDataClient,
      basePath: {
        serverBasePath: '/eyr',
        publicBaseUrl: 'http://localhost:5601/eyr',
        prepend: (path: string) => `http://localhost:5601/eyr${path}`,
      } as IBasePath,
    },
    services,
    scheduleActions,
    executor: async ({ params }: { params: Record<string, any> }) => {
      return alertExecutor({
        services,
        params,
        rule: {
          consumer: APM_SERVER_FEATURE_ID,
          name: 'name',
          producer: 'producer',
          ruleTypeId: 'ruleTypeId',
          ruleTypeName: 'ruleTypeName',
        },
        startedAt: new Date(),
      });
    },
  };
};
