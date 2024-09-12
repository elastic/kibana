/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { searchSourceCommonMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { rulesClientMock } from './rules_client.mock';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { Alert, AlertFactoryDoneUtils } from './alert';
import {
  AlertInstanceContext,
  AlertInstanceState,
  PublicRuleResultService,
  PublicRuleMonitoringService,
} from './types';
import { publicAlertsClientMock } from './alerts_client/alerts_client.mock';
import { maintenanceWindowsServiceMock } from './task_runner/maintenance_windows/maintenance_windows_service.mock';

export { rulesClientMock };

const createSetupMock = () => {
  const mock: jest.Mocked<PluginSetupContract> = {
    registerType: jest.fn(),
    getSecurityHealth: jest.fn(),
    getConfig: jest.fn(),
    frameworkAlerts: {
      enabled: jest.fn(),
      getContextInitializationPromise: jest.fn(),
    },
    getDataStreamAdapter: jest.fn(),
    registerConnectorAdapter: jest.fn(),
  };
  return mock;
};

const createShareStartMock = () => {
  const startContract = {
    url: {
      locators: {
        get: (id: string) => {
          if (id === 'DISCOVER_APP_LOCATOR') {
            return { getRedirectUrl: (params: unknown) => JSON.stringify(params) };
          }
        },
      },
    },
  } as SharePluginStart;
  return startContract;
};

const createStartMock = () => {
  const mock: jest.Mocked<PluginStartContract> = {
    listTypes: jest.fn(),
    getType: jest.fn(),
    getAllTypes: jest.fn(),
    getAlertIndicesAlias: jest.fn(),
    getAlertingAuthorizationWithRequest: jest.fn(),
    getRulesClientWithRequest: jest.fn().mockResolvedValue(rulesClientMock.create()),
    getFrameworkHealth: jest.fn(),
  };
  return mock;
};

export type AlertInstanceMock<
  State extends AlertInstanceState = AlertInstanceState,
  Context extends AlertInstanceContext = AlertInstanceContext
> = jest.Mocked<Alert<State, Context>>;

export const createAlertFactoryMock = {
  create: <
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext
  >() => {
    const mock = {
      hasScheduledActions: jest.fn(),
      isThrottled: jest.fn(),
      getScheduledActionOptions: jest.fn(),
      unscheduleActions: jest.fn(),
      getState: jest.fn(),
      getUuid: jest.fn(),
      scheduleActions: jest.fn(),
      replaceState: jest.fn(),
      updateLastScheduledActions: jest.fn(),
      toJSON: jest.fn(),
      toRaw: jest.fn(),
    };

    // support chaining
    mock.replaceState.mockReturnValue(mock);
    mock.unscheduleActions.mockReturnValue(mock);
    mock.scheduleActions.mockReturnValue(mock);

    return mock as unknown as AlertInstanceMock<InstanceState, InstanceContext>;
  },
  done: <
    InstanceState extends AlertInstanceState = AlertInstanceState,
    InstanceContext extends AlertInstanceContext = AlertInstanceContext,
    ActionGroupIds extends string = string
  >() => {
    const mock: jest.Mocked<AlertFactoryDoneUtils<InstanceState, InstanceContext, ActionGroupIds>> =
      {
        getRecoveredAlerts: jest.fn().mockReturnValue([]),
      };
    return mock;
  },
};

const createAbortableSearchClientMock = () => {
  const mock = {
    search: jest.fn(),
  };

  return mock;
};

const createAbortableSearchServiceMock = () => {
  return {
    asInternalUser: createAbortableSearchClientMock(),
    asCurrentUser: createAbortableSearchClientMock(),
  };
};

const createRuleMonitoringServiceMock = () => {
  const mock = {
    setLastRunMetricsTotalSearchDurationMs: jest.fn(),
    setLastRunMetricsTotalIndexingDurationMs: jest.fn(),
    setLastRunMetricsTotalAlertsDetected: jest.fn(),
    setLastRunMetricsTotalAlertsCreated: jest.fn(),
    setLastRunMetricsGapDurationS: jest.fn(),
  } as unknown as jest.Mocked<PublicRuleMonitoringService>;

  return mock;
};

const createRuleLastRunServiceMock = () => {
  const mock = {
    getLastRunErrors: jest.fn(),
    getLastRunWarnings: jest.fn(),
    getLastRunOutcomeMessages: jest.fn(),
    getLastRunResults: jest.fn(),
    getLastRunSetters: jest.fn(),
  } as unknown as jest.Mocked<PublicRuleResultService>;

  return mock;
};

const createRuleExecutorServicesMock = <
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
>() => {
  const alertFactoryMockCreate = createAlertFactoryMock.create<InstanceState, InstanceContext>();
  const alertFactoryMockDone = createAlertFactoryMock.done<InstanceState, InstanceContext, never>();
  return {
    alertFactory: {
      create: jest.fn().mockReturnValue(alertFactoryMockCreate),
      alertLimit: {
        getValue: jest.fn().mockReturnValue(1000),
        setLimitReached: jest.fn(),
      },
      done: jest.fn().mockReturnValue(alertFactoryMockDone),
    },
    alertsClient: publicAlertsClientMock.create(),
    getDataViews: jest.fn().mockResolvedValue(dataViewPluginMocks.createStartContract()),
    getSearchSourceClient: jest.fn().mockResolvedValue(searchSourceCommonMock),
    maintenanceWindowsService: maintenanceWindowsServiceMock.create(),
    ruleMonitoringService: createRuleMonitoringServiceMock(),
    savedObjectsClient: savedObjectsClientMock.create(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    search: createAbortableSearchServiceMock(),
    share: createShareStartMock(),
    shouldStopExecution: () => true,
    shouldWriteAlerts: () => true,
    uiSettingsClient: uiSettingsServiceMock.createClient(),
  };
};
export type RuleExecutorServicesMock = ReturnType<typeof createRuleExecutorServicesMock>;

export const alertsMock = {
  createAlertFactory: createAlertFactoryMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
  createRuleExecutorServices: createRuleExecutorServicesMock,
};

export const ruleMonitoringServiceMock = { create: createRuleMonitoringServiceMock };

export const ruleLastRunServiceMock = { create: createRuleLastRunServiceMock };

export { createDataStreamAdapterMock } from './alerts_service/lib/data_stream_adapter.mock';
