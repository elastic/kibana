/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsConfigurationUtilities } from './actions_config';

const createActionsConfigMock = () => {
  const mocked: jest.Mocked<ActionsConfigurationUtilities> = {
    isWhitelistedHostname: jest.fn().mockReturnValue(true),
    isWhitelistedUri: jest.fn().mockReturnValue(true),
    isActionTypeEnabled: jest.fn().mockReturnValue(true),
    ensureWhitelistedHostname: jest.fn().mockReturnValue({}),
    ensureWhitelistedUri: jest.fn().mockReturnValue({}),
    ensureActionTypeEnabled: jest.fn().mockReturnValue({}),
  };
  return mocked;
};

export const actionsConfigMock = {
  create: createActionsConfigMock,
};
