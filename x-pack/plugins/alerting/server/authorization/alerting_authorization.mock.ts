/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { AlertingAuthorization } from './alerting_authorization';

type Schema = PublicMethodsOf<AlertingAuthorization>;
export type AlertingAuthorizationMock = jest.Mocked<Schema>;

const createAlertingAuthorizationMock = () => {
  const mocked: AlertingAuthorizationMock = {
    ensureAuthorized: jest.fn(),
    filterByRuleTypeAuthorization: jest.fn(),
    getAuthorizationFilter: jest.fn(),
    getAuthorizedRuleTypes: jest.fn(),
    getFindAuthorizationFilter: jest.fn(),
    getAugmentedRuleTypesWithAuthorization: jest.fn(),
    getSpaceId: jest.fn(),
  };
  return mocked;
};

export const alertingAuthorizationMock: {
  create: () => jest.Mocked<PublicMethodsOf<AlertingAuthorization>>;
} = {
  create: createAlertingAuthorizationMock,
};
