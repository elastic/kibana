/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath, Logger } from 'kibana/server';
import { UMServerLibs } from '../../lib';
import { UptimeCorePluginsSetup, UptimeServerSetup } from '../../adapters';
import type { UptimeRouter } from '../../../types';
import type { IRuleDataClient } from '../../../../../rule_registry/server';
import { ruleRegistryMocks } from '../../../../../rule_registry/server/mocks';
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
export const bootstrapDependencies = (customRequests?: any, customPlugins: any = {}) => {
  const router = {} as UptimeRouter;
  const basePath = {
    prepend: (url: string) => {
      return `/hfe${url}`;
    },
    publicBaseUrl: 'http://localhost:5601/hfe',
    serverBasePath: '/hfe',
  } as IBasePath;
  // these server/libs parameters don't have any functionality, which is fine
  // because we aren't testing them here
  const server = { router, config: {}, basePath } as UptimeServerSetup;
  const plugins: UptimeCorePluginsSetup = customPlugins as any;
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
  const loggerMock = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const scheduleActions = jest.fn();
  const replaceState = jest.fn();

  const services = {
    ...getUptimeESMockClient(),
    ...alertsMock.createAlertServices(),
    alertWithLifecycle: jest.fn().mockReturnValue({ scheduleActions, replaceState }),
    getAlertStartedDate: jest.fn().mockReturnValue('2022-03-17T13:13:33.755Z'),
    logger: loggerMock,
  };

  return {
    dependencies: {
      logger: loggerMock,
      ruleDataClient: ruleRegistryMocks.createRuleDataClient(
        '.alerts-observability.uptime.alerts'
      ) as IRuleDataClient,
    },
    services,
    scheduleActions,
    replaceState,
  };
};
