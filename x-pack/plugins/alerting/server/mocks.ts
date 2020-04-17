/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { alertsClientMock } from './alerts_client.mock';
import { PluginSetupContract, PluginStartContract } from './plugin';
import { savedObjectsClientMock } from '../../../../src/core/server/mocks';
import { AlertInstance } from './alert_instance';
import { searchSetupMock } from '../../../../src/plugins/data/server/mocks';

export { alertsClientMock };

const createSetupMock = () => {
  const mock: jest.Mocked<PluginSetupContract> = {
    registerType: jest.fn(),
  };
  return mock;
};

const createStartMock = () => {
  const mock: jest.Mocked<PluginStartContract> = {
    listTypes: jest.fn(),
    getAlertsClientWithRequest: jest.fn().mockResolvedValue(alertsClientMock.create()),
  };
  return mock;
};

export type AlertInstanceMock = jest.Mocked<AlertInstance>;
const createAlertInstanceFactoryMock = () => {
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

  return (mock as unknown) as AlertInstanceMock;
};

const createAlertServicesMock = () => {
  const alertInstanceFactoryMock = createAlertInstanceFactoryMock();
  const callCluster = jest.fn();
  return {
    alertInstanceFactory: jest
      .fn<jest.Mocked<AlertInstance>, [string]>()
      .mockReturnValue(alertInstanceFactoryMock),
    callCluster,
    savedObjectsClient: savedObjectsClientMock.create(),
    search: searchSetupMock.create().createScopedSearchApi(callCluster).search,
    indexPattern: {
      getById: jest.fn(),
    },
  };
};
export type AlertServicesMock = ReturnType<typeof createAlertServicesMock>;

export const alertsMock = {
  createAlertInstanceFactory: createAlertInstanceFactoryMock,
  createSetup: createSetupMock,
  createStart: createStartMock,
  createAlertServices: createAlertServicesMock,
};
