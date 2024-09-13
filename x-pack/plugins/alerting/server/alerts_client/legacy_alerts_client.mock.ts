/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
const createLegacyAlertsClientMock = () => {
  return jest.fn().mockImplementation(() => {
    return {
      initializeExecution: jest.fn(),
      processAndLogAlerts: jest.fn(),
      getTrackedAlerts: jest.fn(),
      getProcessedAlerts: jest.fn(),
      processAlerts: jest.fn(),
      logAlerts: jest.fn(),
      getAlertsToSerialize: jest.fn(),
      hasReachedAlertLimit: jest.fn(),
      checkLimitUsage: jest.fn(),
      persistAlerts: jest.fn(),
      getAlert: jest.fn(),
      factory: jest.fn(),
      client: jest.fn(),
    };
  });
};

export const legacyAlertsClientMock = {
  create: createLegacyAlertsClientMock(),
};
