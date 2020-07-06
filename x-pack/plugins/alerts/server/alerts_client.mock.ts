/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertsClient } from './alerts_client';

type Schema = PublicMethodsOf<AlertsClient>;
export type AlertsClientMock = jest.Mocked<Schema>;

const createAlertsClientMock = () => {
  const mocked: AlertsClientMock = {
    create: jest.fn(),
    get: jest.fn(),
    getAlertState: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    enable: jest.fn(),
    disable: jest.fn(),
    updateApiKey: jest.fn(),
    muteAll: jest.fn(),
    unmuteAll: jest.fn(),
    muteInstance: jest.fn(),
    unmuteInstance: jest.fn(),
  };
  return mocked;
};

export const alertsClientMock: {
  create: () => AlertsClientMock;
} = {
  create: createAlertsClientMock,
};
