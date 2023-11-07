/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const creatAlertsServiceMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      register: jest.fn(),
      isInitialized: jest.fn(),
      getContextInitializationPromise: jest.fn(),
      createAlertsClient: jest.fn(),
      setAlertsToUntracked: jest.fn(),
    };
  });
};

export const alertsServiceMock = {
  create: creatAlertsServiceMock(),
};
