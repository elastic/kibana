/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { rulesClientMock } from './rules_client.mock';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { Alert } from './alert';
import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../src/core/server/mocks';
import { AlertInstanceContext, AlertInstanceState, ElasticsearchClientWithChild } from './types';

export { rulesClientMock };

const createSetupMock = () => {
  const mock: jest.Mocked<PluginSetupContract> = {
    registerType: jest.fn(),
    getSecurityHealth: jest.fn(),
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
};

const createAlertServicesMock = <
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
>() => {
  const alertFactoryMockCreate = createAlertFactoryMock.create<InstanceState, InstanceContext>();
  const scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();

  const childAsInternalUserClient = elasticsearchServiceMock.createElasticsearchClient();
  const childAsCurrentUserClient = elasticsearchServiceMock.createElasticsearchClient();
  (
    scopedClusterClient.asInternalUser as unknown as jest.Mocked<ElasticsearchClientWithChild>
  ).child.mockReturnValue(childAsInternalUserClient as unknown as Client);
  (
    scopedClusterClient.asCurrentUser as unknown as jest.Mocked<ElasticsearchClientWithChild>
  ).child.mockReturnValue(childAsCurrentUserClient as unknown as Client);

  return {
    alertFactory: {
      create: jest.fn().mockReturnValue(alertFactoryMockCreate),
    },
    savedObjectsClient: savedObjectsClientMock.create(),
    scopedClusterClient,
    shouldWriteAlerts: () => true,
    shouldStopExecution: () => true,
    childAsInternalUserClient,
    childAsCurrentUserClient,
  };
};
export type AlertServicesMock = ReturnType<typeof createAlertServicesMock>;

export const alertsMock = {
  createAlertFactory: createAlertFactoryMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
  createAlertServices: createAlertServicesMock,
};
