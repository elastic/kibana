/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';
import moment from 'moment';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import type { TelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver, TelemetryReceiver } from '../receiver';
import type { SecurityTelemetryTaskConfig } from '../task';
import type { PackagePolicy } from '@kbn/fleet-plugin/common/types/models/package_policy';
import type { ITaskMetricsService } from '../task_metrics.types';
import { type IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import { type UsageCounters } from '@kbn/usage-collection-plugin/common/types';
import { stubEndpointAlertResponse, stubProcessTree, stubFetchTimelineEvents } from './timeline';
import { stubEndpointMetricsAbstractResponse, stubEndpointMetricsByIdResponse } from './metrics';
import { prebuiltRuleAlertsResponse } from './prebuilt_rule_alerts';
import type { ESClusterInfo, ESLicense } from '../types';
import { stubFleetAgentResponse } from './fleet_agent_response';

export const createMockTelemetryEventsSender = (
  enableTelemetry?: boolean,
  canConnect?: boolean
): jest.Mocked<TelemetryEventsSender> => {
  return {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    getClusterID: jest.fn(),
    getTelemetryUsageCluster: jest.fn(),
    fetchTelemetryUrl: jest.fn(),
    queueTelemetryEvents: jest.fn(),
    sendAsync: jest.fn(),
    processEvents: jest.fn(),
    isTelemetryOptedIn: jest.fn().mockReturnValue(enableTelemetry ?? jest.fn()),
    isTelemetryServicesReachable: jest.fn().mockReturnValue(canConnect ?? jest.fn()),
    sendIfDue: jest.fn(),
    sendEvents: jest.fn(),
    sendOnDemand: jest.fn(),
  } as unknown as jest.Mocked<TelemetryEventsSender>;
};

export const stubClusterInfo: ESClusterInfo = {
  cluster_name: 'elasticsearch',
  cluster_uuid: '5Pr5PXRQQpGJUTn0czAvKQ',
  version: {
    number: '8.0.0-SNAPSHOT',
    build_type: 'tar',
    build_hash: '38537ab4a726b42ce8f034aad78d8fca4d4f3e51',
    build_date: moment().toISOString(),
    build_flavor: 'DEFAULT',
    build_snapshot: true,
    lucene_version: '9.2.0',
    minimum_wire_compatibility_version: '7.17.0',
    minimum_index_compatibility_version: '7.0.0',
  },
};

export const stubLicenseInfo: ESLicense = {
  status: 'active',
  uid: '4a7dde08-e5f8-4e50-80f8-bc85b72b4934',
  type: 'trial',
  issue_date: moment().toISOString(),
  issue_date_in_millis: 1653299879146,
  expiry_date: moment().toISOString(),
  expirty_date_in_millis: 1655891879146,
  max_nodes: 1000,
  issued_to: 'elasticsearch',
  issuer: 'elasticsearch',
  start_date_in_millis: -1,
};

export const createMockTelemetryPluginSetup = (): jest.Mocked<TelemetryPluginSetup> => {
  return {
    getTelemetryUrl: jest.fn(() => Promise.resolve(new URL('http://localhost/v3/send'))),
  } as unknown as jest.Mocked<TelemetryPluginSetup>;
};

export const createMockTelemetryPluginStart = (): jest.Mocked<TelemetryPluginStart> => {
  return {
    getIsOptedIn: jest.fn(() => Promise.resolve(true)),
  } as unknown as jest.Mocked<TelemetryPluginStart>;
};

export const createMockUsageCounter = (): jest.Mocked<IUsageCounter> => {
  return {
    incrementCounter: jest.fn((_: UsageCounters.v1.IncrementCounterParams) => {}),
  } as unknown as jest.Mocked<IUsageCounter>;
};

export const createMockTaskMetrics = (): jest.Mocked<ITaskMetricsService> => {
  return {
    incrementCounter: jest.fn((_: UsageCounters.v1.IncrementCounterParams) => {}),
    start: jest.fn(() => {
      return { name: 'test-trace', startedAt: 0 };
    }),
    end: jest.fn(),
  } as unknown as jest.Mocked<ITaskMetricsService>;
};

export const createMockTelemetryReceiver = (
  diagnosticsAlert?: unknown,
  emptyTimelineTree?: boolean
): jest.Mocked<ITelemetryReceiver> => {
  const processTreeResponse = emptyTimelineTree
    ? Promise.resolve([])
    : Promise.resolve(Promise.resolve(stubProcessTree()));

  return {
    start: jest.fn(),
    fetchClusterInfo: jest.fn().mockReturnValue(stubClusterInfo),
    getClusterInfo: jest.fn().mockReturnValue(stubClusterInfo),
    fetchLicenseInfo: jest.fn().mockReturnValue(stubLicenseInfo),
    copyLicenseFields: jest.fn(),
    fetchFleetAgents: jest.fn().mockReturnValue(stubFleetAgentResponse),
    openPointInTime: jest.fn().mockReturnValue(Promise.resolve('test-pit-id')),
    getAlertsIndex: jest.fn().mockReturnValue('alerts-*'),
    fetchDiagnosticAlertsBatch: jest.fn().mockReturnValue(diagnosticsAlert ?? jest.fn()),
    getExperimentalFeatures: jest.fn().mockReturnValue(undefined),
    fetchEndpointMetricsAbstract: jest.fn().mockReturnValue(stubEndpointMetricsAbstractResponse),
    fetchEndpointMetricsById: jest.fn().mockReturnValue(stubEndpointMetricsByIdResponse),
    fetchEndpointPolicyResponses: jest.fn(),
    fetchPrebuiltRuleAlertsBatch: jest.fn().mockReturnValue(prebuiltRuleAlertsResponse),
    fetchDetectionRulesPackageVersion: jest.fn(),
    fetchTrustedApplications: jest.fn(),
    fetchEndpointList: jest.fn(),
    fetchDetectionRules: jest.fn().mockReturnValue({ body: null }),
    fetchEndpointMetadata: jest.fn(),
    fetchTimelineAlerts: jest.fn().mockReturnValue(Promise.resolve(stubEndpointAlertResponse())),
    buildProcessTree: jest.fn().mockReturnValue(processTreeResponse),
    fetchTimelineEvents: jest.fn().mockReturnValue(Promise.resolve(stubFetchTimelineEvents())),
    fetchValueListMetaData: jest.fn(),
  } as unknown as jest.Mocked<TelemetryReceiver>;
};

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
