/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const createAlertsClientMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      initialize: jest.fn(),
      create: jest.fn(),
      hasReachedAlertLimit: jest.fn(),
      checkLimitUsage: jest.fn(),
      processAndLogAlerts: jest.fn(),
      getProcessedAlerts: jest.fn(),
      getAlertsToSerialize: jest.fn(),
      getExecutorServices: jest.fn(),
    };
  });
};

export const alertsClientMock = {
  create: createAlertsClientMock(),
};
