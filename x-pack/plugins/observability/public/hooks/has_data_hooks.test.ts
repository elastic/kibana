/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import { registerDataHandler, unregisterDataHandler } from '../data_handler';
import {
  ApmFetchDataResponse,
  LogsFetchDataResponse,
  MetricsFetchDataResponse,
  UptimeFetchDataResponse,
} from '../typings/fetch_overview_data';
import {
  useApmHasData,
  useInfraLogsHasData,
  useInfraMetricsHasData,
  useUptimeHasData,
} from './has_data_hooks';

describe('Has data hooks', () => {
  const originalConsole = global.console;
  beforeAll(() => {
    // mocks console to avoid polluting the test output
    global.console = ({ error: jest.fn() } as unknown) as typeof console;
  });

  afterAll(() => {
    global.console = originalConsole;
  });

  const checkResults = async ({
    logs: logsR,
    metrics: metricsR,
    apm: apmR,
    uptime: uptimeR,
  }: {
    logs: boolean;
    metrics: boolean;
    apm: boolean;
    uptime: boolean;
  }) => {
    const { result: infra, waitFor: logsWF } = renderHook(() => useInfraLogsHasData());
    await logsWF(() => infra.current.status === 'failure');
    expect(infra.current.data).toBe(logsR);

    const { result: logs, waitFor: metricsWF } = renderHook(() => useInfraMetricsHasData());
    await metricsWF(() => logs.current.status === 'failure');
    expect(logs.current.data).toBe(metricsR);

    const { result: apm, waitFor: apmWF } = renderHook(() => useApmHasData());
    await apmWF(() => apm.current.status === 'failure');
    expect(apm.current.data).toBe(apmR);

    const { result: uptime, waitFor: uptimeWF } = renderHook(() => useUptimeHasData());
    await uptimeWF(() => uptime.current.status === 'failure');
    expect(uptime.current.data).toBe(uptimeR);
  };

  beforeEach(() => {
    unregisterDataHandler({ appName: 'apm' });
    unregisterDataHandler({ appName: 'infra_logs' });
    unregisterDataHandler({ appName: 'infra_metrics' });
    unregisterDataHandler({ appName: 'uptime' });
  });

  it('returns false when an exception happens', async () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: async () => (({} as unknown) as ApmFetchDataResponse),
      hasData: async () => {
        throw new Error('BOOM');
      },
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => (({} as unknown) as LogsFetchDataResponse),
      hasData: async () => {
        throw new Error('BOOM');
      },
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => (({} as unknown) as MetricsFetchDataResponse),
      hasData: async () => {
        throw new Error('BOOM');
      },
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: async () => (({} as unknown) as UptimeFetchDataResponse),
      hasData: async () => {
        throw new Error('BOOM');
      },
    });

    checkResults({ logs: false, metrics: false, apm: false, uptime: false });
  });

  it('returns true when has data and false when an exception happens', async () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: async () => (({} as unknown) as ApmFetchDataResponse),
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => (({} as unknown) as LogsFetchDataResponse),
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => (({} as unknown) as MetricsFetchDataResponse),
      hasData: async () => {
        throw new Error('BOOM');
      },
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: async () => (({} as unknown) as UptimeFetchDataResponse),
      hasData: async () => {
        throw new Error('BOOM');
      },
    });

    checkResults({ logs: true, metrics: false, apm: true, uptime: false });
  });

  it('returns true when has data', async () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: async () => (({} as unknown) as ApmFetchDataResponse),
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => (({} as unknown) as LogsFetchDataResponse),
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => (({} as unknown) as MetricsFetchDataResponse),
      hasData: async () => true,
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: async () => (({} as unknown) as UptimeFetchDataResponse),
      hasData: async () => true,
    });

    checkResults({ logs: true, metrics: true, apm: true, uptime: true });
  });

  it('returns false when has no data', async () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: async () => (({} as unknown) as ApmFetchDataResponse),
      hasData: async () => false,
    });
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => (({} as unknown) as LogsFetchDataResponse),
      hasData: async () => false,
    });
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => (({} as unknown) as MetricsFetchDataResponse),
      hasData: async () => false,
    });
    registerDataHandler({
      appName: 'uptime',
      fetchData: async () => (({} as unknown) as UptimeFetchDataResponse),
      hasData: async () => false,
    });

    checkResults({ logs: false, metrics: false, apm: false, uptime: false });
  });

  it('returns false when has data was not registered', async () => {
    checkResults({ logs: false, metrics: false, apm: false, uptime: false });
  });
});
