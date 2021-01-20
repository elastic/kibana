/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import { AlertsAuthorization } from './alerts_authorization';

type Schema = PublicMethodsOf<AlertsAuthorization>;
export type AlertsAuthorizationMock = jest.Mocked<Schema>;

const createAlertsAuthorizationMock = () => {
  const mocked: AlertsAuthorizationMock = {
    ensureAuthorized: jest.fn(),
    filterByAlertTypeAuthorization: jest.fn(),
    getFindAuthorizationFilter: jest.fn(),
  };
  return mocked;
};

export const alertsAuthorizationMock: {
  create: () => AlertsAuthorizationMock;
} = {
  create: createAlertsAuthorizationMock,
};
