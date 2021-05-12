/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsConfigurationUtilities } from './actions_config';

const createActionsConfigMock = () => {
  const mocked: jest.Mocked<ActionsConfigurationUtilities> = {
    isHostnameAllowed: jest.fn().mockReturnValue(true),
    isUriAllowed: jest.fn().mockReturnValue(true),
    isActionTypeEnabled: jest.fn().mockReturnValue(true),
    ensureHostnameAllowed: jest.fn().mockReturnValue({}),
    ensureUriAllowed: jest.fn().mockReturnValue({}),
    ensureActionTypeEnabled: jest.fn().mockReturnValue({}),
    isRejectUnauthorizedCertificatesEnabled: jest.fn().mockReturnValue(true),
    getProxySettings: jest.fn().mockReturnValue(undefined),
    getResponseSettings: jest.fn().mockReturnValue({
      maxContentLength: 1000000,
      timeout: 360000,
    }),
    getCustomHostSettings: jest.fn().mockReturnValue(undefined),
  };
  return mocked;
};

export const actionsConfigMock = {
  create: createActionsConfigMock,
};
