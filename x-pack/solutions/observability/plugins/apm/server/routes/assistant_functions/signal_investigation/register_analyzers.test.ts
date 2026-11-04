/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { SignalAnalyzer, SignalAnalyzerDeps } from '@kbn/signal-investigation-contract';
import { getMlJobsWithAPMGroup } from '../../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../../lib/helpers/get_ml_client';
import type { APMCore } from '../../typings';
import { getInfrastructureData } from '../../infrastructure/get_infrastructure_data';
import { getContainerHostNames } from '../../infrastructure/get_host_names';
import { getAnomaliesWithContext } from '../get_apm_service_summary/get_anomalies';
import { registerApmSignalAnalyzers } from './register_analyzers';

jest.mock('../../../lib/helpers/get_apm_event_client', () => ({
  getApmEventClient: jest.fn(async () => ({})),
}));
jest.mock('../../../lib/helpers/get_ml_client', () => ({
  getMlClient: jest.fn(),
}));
jest.mock('../../../lib/anomaly_detection/get_ml_jobs_with_apm_group', () => ({
  getMlJobsWithAPMGroup: jest.fn(),
}));
jest.mock('../../infrastructure/get_infrastructure_data', () => ({
  getInfrastructureData: jest.fn(),
}));
jest.mock('../../infrastructure/get_host_names', () => ({
  getContainerHostNames: jest.fn(),
}));
jest.mock('../get_apm_service_summary/get_anomalies', () => ({
  getAnomaliesWithContext: jest.fn(),
}));

const getInfrastructureDataMock = getInfrastructureData as jest.MockedFunction<
  typeof getInfrastructureData
>;
const getMlClientMock = getMlClient as jest.MockedFunction<typeof getMlClient>;
const getMlJobsWithAPMGroupMock = getMlJobsWithAPMGroup as jest.MockedFunction<
  typeof getMlJobsWithAPMGroup
>;
const getContainerHostNamesMock = getContainerHostNames as jest.MockedFunction<
  typeof getContainerHostNames
>;
const getAnomaliesWithContextMock = getAnomaliesWithContext as jest.MockedFunction<
  typeof getAnomaliesWithContext
>;
const getApmEventClientMock = getApmEventClient as jest.MockedFunction<typeof getApmEventClient>;

const core = { setup: {} as APMCore['setup'], start: async () => ({} as never) };
const getApmIndices = async () => ({} as never);
const logger = loggingSystemMock.createLogger();
const plugins = {
  metricsDataAccess: { setup: { client: {} } },
  ml: { setup: {} },
} as never;
const deps = {
  request: {},
  context: {
    core: Promise.resolve({
      savedObjects: { client: {}, getClient: jest.fn(() => ({})) },
      elasticsearch: { client: { asCurrentUser: { search: jest.fn() } } },
    }),
    licensing: Promise.resolve({}),
  },
} as unknown as SignalAnalyzerDeps;

const seed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout', 'service.environment': 'production' },
  ...overrides,
});

describe('registerApmSignalAnalyzers', () => {
  beforeEach(() => {
    getApmEventClientMock.mockResolvedValue({} as never);
    getInfrastructureDataMock.mockReset();
    getMlClientMock.mockReset();
    getMlJobsWithAPMGroupMock.mockReset();
    getContainerHostNamesMock.mockReset();
    getAnomaliesWithContextMock.mockReset();
  });

  it('does not register when Find related changes is absent', () => {
    expect(() =>
      registerApmSignalAnalyzers({
        signalInvestigation: undefined,
        core,
        getApmIndices,
        plugins,
        logger,
      })
    ).not.toThrow();
  });

  it('registers host, change-point, and anomaly analyzers with their authorization classes', () => {
    const registered: SignalAnalyzer[] = [];
    registerApmSignalAnalyzers({
      signalInvestigation: { registerAnalyzer: (analyzer) => registered.push(analyzer) },
      core,
      getApmIndices,
      plugins,
      logger,
    });

    expect(registered.map((analyzer) => ({ id: analyzer.id, authz: analyzer.authz }))).toEqual([
      { id: 'service_hosts', authz: 'apm' },
      { id: 'service_change_points', authz: 'apm' },
      { id: 'dependency_change_points', authz: 'apm' },
      { id: 'service_anomalies', authz: 'apm_ml' },
    ]);
  });

  it('returns bounded host.name entities and no leads from service_hosts', async () => {
    const registered: SignalAnalyzer[] = [];
    registerApmSignalAnalyzers({
      signalInvestigation: { registerAnalyzer: (analyzer) => registered.push(analyzer) },
      core,
      getApmIndices,
      plugins,
      logger,
    });
    const serviceHosts = registered.find((analyzer) => analyzer.id === 'service_hosts')!;

    getInfrastructureDataMock.mockResolvedValue({
      containerIds: [],
      podNames: [],
      hostNames: Array.from({ length: 12 }, (_, index) => `host-${index}`),
    });

    const result = await serviceHosts.run(seed(), deps, new AbortController().signal);

    expect(result.leads).toEqual([]);
    expect(result.status).toBe('found');
    expect(result.entities?.['host.name']).toHaveLength(10);
    expect(result.message).toBe('Showing 10 of 12 hosts.');
    expect(getContainerHostNamesMock).not.toHaveBeenCalled();
  });

  it('uses container-derived hosts when the service runs in containers', async () => {
    const registered: SignalAnalyzer[] = [];
    registerApmSignalAnalyzers({
      signalInvestigation: { registerAnalyzer: (analyzer) => registered.push(analyzer) },
      core,
      getApmIndices,
      plugins,
      logger,
    });
    const serviceHosts = registered.find((analyzer) => analyzer.id === 'service_hosts')!;

    getInfrastructureDataMock.mockResolvedValue({
      containerIds: ['container-1'],
      podNames: [],
      hostNames: ['unreliable-apm-host'],
    });
    getContainerHostNamesMock.mockResolvedValue(['node-1', 'node-2']);

    const result = await serviceHosts.run(seed(), deps, new AbortController().signal);

    expect(getContainerHostNamesMock).toHaveBeenCalledWith(
      expect.objectContaining({ containerIds: ['container-1'] })
    );
    expect(result.entities?.['host.name']).toEqual(['node-1', 'node-2']);
  });

  it('reports not_set_up when no apm-group ML job covers the environment, and no_change when a job finds no records', async () => {
    const registered: SignalAnalyzer[] = [];
    registerApmSignalAnalyzers({
      signalInvestigation: { registerAnalyzer: (analyzer) => registered.push(analyzer) },
      core,
      getApmIndices,
      plugins,
      logger,
    });
    const serviceAnomalies = registered.find((analyzer) => analyzer.id === 'service_anomalies')!;

    getMlClientMock.mockResolvedValue({ anomalyDetectors: {}, mlSystem: {}, modules: {} } as never);
    getMlJobsWithAPMGroupMock.mockResolvedValueOnce([
      { jobId: 'apm-staging', environment: 'staging' as never, version: 1, bucketSpan: '15m' },
    ]);

    const notSetUp = await serviceAnomalies.run(seed(), deps, new AbortController().signal);
    expect(notSetUp).toEqual({
      leads: [],
      entities: {},
      status: 'not_set_up',
      message: 'Anomaly detection isn’t set up for production.',
    });

    getMlJobsWithAPMGroupMock.mockResolvedValueOnce([
      { jobId: 'apm-prod', environment: 'production' as never, version: 1, bucketSpan: '15m' },
    ]);
    getAnomaliesWithContextMock.mockResolvedValueOnce([]);

    const noChange = await serviceAnomalies.run(seed(), deps, new AbortController().signal);
    expect(noChange).toEqual({
      leads: [],
      entities: {},
      status: 'no_change',
    });
  });
});
