/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConcreteTaskInstance, TaskStatus } from '../../../../../task_manager/server';
import { TelemetryEventsSender } from '../sender';
import { TelemetryReceiver } from '../receiver';
import { SecurityTelemetryTaskConfig } from '../task';
import { PackagePolicy } from '../../../../../fleet/common/types/models/package_policy';

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
    getClusterID: jest.fn(),
    fetchTelemetryUrl: jest.fn(),
    queueTelemetryEvents: jest.fn(),
    processEvents: jest.fn(),
    isTelemetryOptedIn: jest.fn().mockReturnValue(enableTelemetry ?? jest.fn()),
    sendIfDue: jest.fn(),
    sendEvents: jest.fn(),
    sendOnDemand: jest.fn(),
  } as unknown as jest.Mocked<TelemetryEventsSender>;
};

export const createMockTelemetryReceiver = (
  diagnosticsAlert?: unknown
): jest.Mocked<TelemetryReceiver> => {
  return {
    start: jest.fn(),
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
 * Creates a mocked Security Telemetry Task Config
 */
export const createMockSecurityTelemetryTask = (
  testType?: string,
  testLastTimestamp?: string
): jest.Mocked<SecurityTelemetryTaskConfig> => {
  return {
    type: testType,
    title: 'test title',
    interval: '0m',
    timeout: '0m',
    version: '0.0.0',
    getLastExecutionTime: jest.fn().mockReturnValue(testLastTimestamp ?? jest.fn()),
    runTask: jest.fn(),
  } as unknown as jest.Mocked<SecurityTelemetryTaskConfig>;
};

/**
 * Creates a mocked Task Instance
 */
export const createMockTaskInstance = (testId: string, testType: string): ConcreteTaskInstance => {
  return {
    id: testId,
    runAt: new Date(),
    attempts: 0,
    ownerId: '',
    status: TaskStatus.Running,
    startedAt: new Date(),
    scheduledAt: new Date(),
    retryAt: new Date(),
    params: {},
    state: {},
    taskType: testType,
  } as ConcreteTaskInstance;
};
