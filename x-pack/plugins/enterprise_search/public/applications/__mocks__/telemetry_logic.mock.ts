/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const mockTelemetryActions = {
  sendTelemetry: jest.fn(),
  sendEnterpriseSearchTelemetry: jest.fn(),
  sendAppSearchTelemetry: jest.fn(),
  sendWorkplaceSearchTelemetry: jest.fn(),
};

jest.mock('../shared/telemetry', () => ({
  ...(jest.requireActual('../shared/telemetry') as object),
  TelemetryLogic: { actions: mockTelemetryActions },
}));
