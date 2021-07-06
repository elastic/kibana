/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { of } from 'rxjs';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import type { RuleDataClient } from '../../../../../rule_registry/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../../../alerting/server';
import { APMConfig } from '../../..';

export const createRuleTypeMocks = () => {
  let alertExecutor: (...args: any[]) => Promise<any>;

  const mockedConfig$ = of({
    /* eslint-disable @typescript-eslint/naming-convention */
    'apm_oss.errorIndices': 'apm-*',
    'apm_oss.transactionIndices': 'apm-*',
    /* eslint-enable @typescript-eslint/naming-convention */
  } as APMConfig);

  const loggerMock = ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown) as Logger;

  const alerting = {
    registerType: ({ executor }) => {
      alertExecutor = executor;
    },
  } as AlertingPluginSetupContract;

  const scheduleActions = jest.fn();

  const services = {
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    alertInstanceFactory: jest.fn(() => ({ scheduleActions })),
    alertWithLifecycle: jest.fn(),
    logger: loggerMock,
  };

  return {
    dependencies: {
      alerting,
      config$: mockedConfig$,
      logger: loggerMock,
      ruleDataClient: ({
        getReader: () => {
          return {
            search: jest.fn(),
          };
        },
        getWriter: () => {
          return {
            bulk: jest.fn(),
          };
        },
        isWriteEnabled: jest.fn(() => true),
      } as unknown) as RuleDataClient,
    },
    services,
    scheduleActions,
    executor: async ({ params }: { params: Record<string, any> }) => {
      return alertExecutor({
        services,
        params,
        startedAt: new Date(),
      });
    },
  };
};
