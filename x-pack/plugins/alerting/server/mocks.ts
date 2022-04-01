/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from './rules_client.mock';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { Alert, AlertFactoryDoneUtils } from './alert';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
  httpServerMock,
} from '../../../../src/core/server/mocks';
import { dataPluginMock } from '../../../../src/plugins/data/server/mocks';
import { AlertInstanceContext, AlertInstanceState } from './types';

export { rulesClientMock };

const createSetupMock = () => {
  const mock: jest.Mocked<PluginSetupContract> = {
    registerType: jest.fn(),
    getSecurityHealth: jest.fn(),
    getConfig: jest.fn(),
  };
  return mock;
};

const createStartMock = () => {
  const mock: jest.Mocked<PluginStartContract> = {
    listTypes: jest.fn(),
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

const createAlertFactoryMock = {
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

const createAlertServicesMock = <
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
>() => {
  const alertFactoryMockCreate = createAlertFactoryMock.create<InstanceState, InstanceContext>();
  const alertFactoryMockDone = createAlertFactoryMock.done<InstanceState, InstanceContext, never>();
  return {
    alertFactory: {
      create: jest.fn().mockReturnValue(alertFactoryMockCreate),
      done: jest.fn().mockReturnValue(alertFactoryMockDone),
    },
    savedObjectsClient: savedObjectsClientMock.create(),
    uiSettingsClient: uiSettingsServiceMock.createClient(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    shouldWriteAlerts: () => true,
    shouldStopExecution: () => true,
    search: createAbortableSearchServiceMock(),
    searchSourceClient: Promise.resolve(
      dataPluginMock
        .createStartContract()
        .search.searchSource.asScoped(httpServerMock.createKibanaRequest())
    ),
  };
};
export type AlertServicesMock = ReturnType<typeof createAlertServicesMock>;

export const alertsMock = {
  createAlertFactory: createAlertFactoryMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
  createAlertServices: createAlertServicesMock,
};
