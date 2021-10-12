/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { TelemetryEventsSender } from './sender';
import { TelemetryReceiver } from './receiver';
import { DiagnosticTask, EndpointTask, ExceptionListsTask } from './tasks';
import { PackagePolicy } from '../../../../fleet/common/types/models/package_policy';

/**
 * Creates a mocked Telemetry Events Sender
 */
export const createMockTelemetryEventsSender = (
  enableTelemtry: boolean
): jest.Mocked<TelemetryEventsSender> => {
  return {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    fetchTelemetryUrl: jest.fn(),
    queueTelemetryEvents: jest.fn(),
    processEvents: jest.fn(),
    isTelemetryOptedIn: jest.fn().mockReturnValue(enableTelemtry ?? jest.fn()),
    sendIfDue: jest.fn(),
    sendEvents: jest.fn(),
  } as unknown as jest.Mocked<TelemetryEventsSender>;
};

export const createMockTelemetryReceiver = (): jest.Mocked<TelemetryReceiver> => {
  return {
    start: jest.fn(),
    fetchClusterInfo: jest.fn(),
    fetchLicenseInfo: jest.fn(),
    copyLicenseFields: jest.fn(),
    fetchDiagnosticAlerts: jest.fn(),
    fetchEndpointMetrics: jest.fn(),
    fetchEndpointPolicyResponses: jest.fn(),
    fetchTrustedApplications: jest.fn(),
  } as unknown as jest.Mocked<TelemetryReceiver>;
};

/**
 * Creates a mocked package policy
 */
export const createMockPackagePolicy = (): jest.Mocked<PackagePolicy> => {
  return {
    id: jest.fn(),
    inputs: jest.fn(),
    version: jest.fn(),
    revision: jest.fn(),
    updated_at: jest.fn(),
    updated_by: jest.fn(),
    created_at: jest.fn(),
    created_by: jest.fn(),
  } as unknown as jest.Mocked<PackagePolicy>;
};

/**
 * Creates a mocked Telemetry Diagnostic Task
 */
export class MockTelemetryDiagnosticTask extends DiagnosticTask {
  public runTask = jest.fn();
}

/**
 * Creates a mocked Telemetry Endpoint Task
 */
export class MockTelemetryEndpointTask extends EndpointTask {
  public runTask = jest.fn();
}

/**
 * Creates a mocked Telemetry exception lists Task
 */
export class MockExceptionListsTask extends ExceptionListsTask {
  public runTask = jest.fn();
}
