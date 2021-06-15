/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { TelemetryEventsSender } from './sender';
import { TelemetryDiagTask } from './diagnostic_task';
import { TelemetryEndpointTask } from './endpoint_task';

/**
 * Creates a mocked Telemetry Events Sender
 */
export const createMockTelemetryEventsSender = (
  enableTelemtry: boolean
): jest.Mocked<TelemetryEventsSender> => {
  return ({
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    fetchDiagnosticAlerts: jest.fn(),
    queueTelemetryEvents: jest.fn(),
    processEvents: jest.fn(),
    isTelemetryOptedIn: jest.fn().mockReturnValue(enableTelemtry ?? jest.fn()),
    sendIfDue: jest.fn(),
    fetchClusterInfo: jest.fn(),
    fetchTelemetryUrl: jest.fn(),
    fetchLicenseInfo: jest.fn(),
    copyLicenseFields: jest.fn(),
    sendEvents: jest.fn(),
  } as unknown) as jest.Mocked<TelemetryEventsSender>;
};

/**
 * Creates a mocked Telemetry Diagnostic Task
 */
export class MockTelemetryDiagnosticTask extends TelemetryDiagTask {
  public runTask = jest.fn();
}

/**
 * Creates a mocked Telemetry Endpoint Task
 */
export class MockTelemetryEndpointTask extends TelemetryEndpointTask {
  public runTask = jest.fn();
}
