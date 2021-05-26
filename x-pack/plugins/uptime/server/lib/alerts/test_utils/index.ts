/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { UMServerLibs } from '../../lib';
import { UptimeCorePlugins, UptimeCoreSetup } from '../../adapters';
import type { UptimeRouter } from '../../../types';
import type { RuleDataClient } from '../../../../../rule_registry/server';
import { PluginSetupContract as AlertingPluginSetupContract } from '../../../../../alerting/server';
import { getUptimeESMockClient } from '../../requests/helper';
import { alertsMock } from '../../../../../alerting/server/mocks';
import { DynamicSettings } from '../../../../common/runtime_types';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';

/**
 * The alert takes some dependencies as parameters; these are things like
 * kibana core services and plugins. This function helps reduce the amount of
 * boilerplate required.
 * @param customRequests client tests can use this paramter to provide their own request mocks,
 * so we don't have to mock them all for each test.
 */
export const bootstrapDependencies = (customRequests?: any) => {
  const router = {} as UptimeRouter;
  // these server/libs parameters don't have any functionality, which is fine
  // because we aren't testing them here
  const server: UptimeCoreSetup = { router };
  const plugins: UptimeCorePlugins = {} as any;
  const libs: UMServerLibs = { requests: {} } as UMServerLibs;
  libs.requests = { ...libs.requests, ...customRequests };
  return { server, libs, plugins };
};

export const createRuleTypeMocks = (
  dynamicCertSettings: {
    certAgeThreshold: DynamicSettings['certAgeThreshold'];
    certExpirationThreshold: DynamicSettings['certExpirationThreshold'];
  } = {
    certAgeThreshold: DYNAMIC_SETTINGS_DEFAULTS.certAgeThreshold,
    certExpirationThreshold: DYNAMIC_SETTINGS_DEFAULTS.certExpirationThreshold,
  }
) => {
  let alertExecutor: (...args: any[]) => Promise<any>;

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
  const replaceState = jest.fn();

  const services = {
    ...getUptimeESMockClient(),
    ...alertsMock.createAlertServices(),
    alertWithLifecycle: jest.fn().mockReturnValue({ scheduleActions, replaceState }),
    dynamicSettings: dynamicCertSettings,
    logger: loggerMock,
  };

  return {
    dependencies: {
      alerting,
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
    replaceState,
    executor: async ({ params }: { params: Record<string, any> }) => {
      return alertExecutor({
        services,
        params,
        startedAt: new Date(),
      });
    },
  };
};
