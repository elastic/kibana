/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEventsSender } from '../sender';
import type { TelemetryReceiver } from '../receiver';

/**
 * Creates a mocked Telemetry Events Sender
 */
export const createMockTelemetryEventsSender = (
  enableTelemetry?: boolean
): jest.Mocked<TelemetryEventsSender> => {
  return {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    fetchTelemetryUrl: jest.fn(),
    queueTelemetryEvents: jest.fn(),
    processEvents: jest.fn(),
    isTelemetryOptedIn: jest.fn().mockReturnValue(enableTelemetry ?? jest.fn()),
    sendIfDue: jest.fn(),
    sendEvents: jest.fn(),
  } as unknown as jest.Mocked<TelemetryEventsSender>;
};

export const createMockTelemetryReceiver = (
  diagnosticsAlert?: unknown
): jest.Mocked<TelemetryReceiver> => {
  return {
    start: jest.fn(),
    fetchClusterInfo: jest.fn(),
    fetchLicenseInfo: jest.fn(),
    copyLicenseFields: jest.fn(),
    fetchFleetAgents: jest.fn(),
    fetchDiagnosticAlerts: jest.fn().mockReturnValue(diagnosticsAlert ?? jest.fn()),
    fetchEndpointMetrics: jest.fn(),
    fetchEndpointPolicyResponses: jest.fn(),
    fetchTrustedApplications: jest.fn(),
    fetchEndpointList: jest.fn(),
    fetchDetectionRules: jest.fn().mockReturnValue({ body: null }),
  } as unknown as jest.Mocked<TelemetryReceiver>;
};
