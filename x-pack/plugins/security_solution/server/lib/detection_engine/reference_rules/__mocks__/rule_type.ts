/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { v4 } from 'uuid';

import { Logger } from 'kibana/server';
import { elasticsearchServiceMock } from 'src/core/server/mocks';

import type { RuleDataClient } from '../../../../../../rule_registry/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../../../../alerting/server';
import { ConfigType } from '../../../../config';

export const createRuleTypeMocks = () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let alertExecutor: (...args: any[]) => Promise<any>;

  const mockedConfig$ = of({} as ConfigType);

  const loggerMock = ({
    debug: jest.fn(),
    info: jest.fn(),
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
    findAlerts: jest.fn(), // TODO: does this stay?
    alertWithPersistence: jest.fn(),
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
      } as unknown) as RuleDataClient,
    },
    services,
    scheduleActions,
    executor: async ({ params }: { params: Record<string, unknown> }) => {
      return alertExecutor({
        services,
        params,
        alertId: v4(),
        startedAt: new Date(),
      });
    },
  };
};
