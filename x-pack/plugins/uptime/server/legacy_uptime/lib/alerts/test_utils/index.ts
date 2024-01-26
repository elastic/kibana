/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath, Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import type { AlertsLocatorParams } from '@kbn/observability-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { SharePluginSetup } from '@kbn/share-plugin/server';
import { UMServerLibs } from '../../lib';
import { UptimeCorePluginsSetup, UptimeServerSetup } from '../../adapters';
import { getUptimeESMockClient } from '../../requests/test_helpers';

/**
 * The alert takes some dependencies as parameters; these are things like
 * kibana core services and plugins. This function helps reduce the amount of
 * boilerplate required.
 * @param customRequests client tests can use this paramter to provide their own request mocks,
 * so we don't have to mock them all for each test.
 */
export const bootstrapDependencies = (
  customRequests?: any,
  customPlugins: any = { observability: { getAlertDetailsConfig: () => ({ uptime: true }) } }
) => {
  const basePath = {
    prepend: (url: string) => {
      return `/hfe${url}`;
    },
    publicBaseUrl: 'http://localhost:5601/hfe',
    serverBasePath: '/hfe',
  } as IBasePath;

  const alertsLocator = {
    getLocation: jest.fn().mockImplementation(() => ({
      path: 'mockedAlertsLocator > getLocation',
    })),
  } as any as LocatorPublic<AlertsLocatorParams>;
  const share = {
    url: {
      locators: {
        get: () => alertsLocator,
      },
    },
  } as any as SharePluginSetup;
  // these server/libs parameters don't have any functionality, which is fine
  // because we aren't testing them here
  const server = {
    config: {},
    basePath,
    share,
  } as UptimeServerSetup;
  const plugins: UptimeCorePluginsSetup = customPlugins as any;
  const libs: UMServerLibs = { requests: {} } as UMServerLibs;
  libs.requests = { ...libs.requests, ...customRequests };
  return { server, libs, plugins };
};

export const createRuleTypeMocks = (recoveredAlerts: Array<Record<string, any>> = []) => {
  const loggerMock = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  const scheduleActions = jest.fn();
  const replaceState = jest.fn();
  const setContext = jest.fn();

  const services = {
    ...getUptimeESMockClient(),
    ...alertsMock.createRuleExecutorServices(),
    alertFactory: {
      ...alertsMock.createRuleExecutorServices().alertFactory,
      done: () => ({
        getRecoveredAlerts: () => createRecoveredAlerts(recoveredAlerts, setContext),
      }),
    },
    alertWithLifecycle: jest.fn().mockReturnValue({ scheduleActions, replaceState }),
    getAlertStartedDate: jest.fn().mockReturnValue('2022-03-17T13:13:33.755Z'),
    getAlertUuid: jest.fn().mockReturnValue('mock-alert-uuid'),
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
    setContext,
  };
};

const createRecoveredAlerts = (alerts: Array<Record<string, any>>, setContext: jest.Mock) => {
  return alerts.map((alert) => ({
    getId: () => 'mock-id',
    getState: () => alert,
    setContext,
    context: {},
  }));
};
