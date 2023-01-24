/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { AlertsClient } from './alerts_client';

type Schema = PublicMethodsOf<AlertsClient>;
export type AlertsClientMock = jest.Mocked<Schema>;

const createAlertsClientMock = () => {
  const mocked: AlertsClientMock = {
    get: jest.fn(),
    update: jest.fn(),
    getAuthorizedAlertsIndices: jest.fn(),
    bulkUpdate: jest.fn(),
    find: jest.fn(),
    getFeatureIdsByRegistrationContexts: jest.fn(),
    getBrowserFields: jest.fn(),
    getAlertSummary: jest.fn(),
  };
  return mocked;
};

export const alertsClientMock: {
  create: () => AlertsClientMock;
} = {
  create: createAlertsClientMock,
};
