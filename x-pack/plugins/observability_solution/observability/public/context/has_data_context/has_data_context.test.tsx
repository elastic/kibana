/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { registerDataHandler, unregisterDataHandler } from './data_handler';
import { useHasData } from '../../hooks/use_has_data';
import { HasData, ObservabilityFetchDataPlugins } from '../../typings/fetch_overview_data';
import { HasDataContextProvider } from './has_data_context';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { ApmIndicesConfig } from '../../../common/typings';
import { renderHook, waitFor } from '@testing-library/react';

const sampleAPMIndices = { transaction: 'apm-*' } as ApmIndicesConfig;

const core = coreMock.createStart();

function wrapper({ children }: { children: React.ReactElement }) {
  const history = createMemoryHistory();
  return (
    <KibanaContextProvider services={{ ...core }}>
      <Router history={history}>
        <HasDataContextProvider>{children}</HasDataContextProvider>
      </Router>
    </KibanaContextProvider>
  );
}

function unregisterAll() {
  unregisterDataHandler({ appName: 'apm' });
  unregisterDataHandler({ appName: 'infra_logs' });
  unregisterDataHandler({ appName: 'infra_metrics' });
  unregisterDataHandler({ appName: 'uptime' });
  unregisterDataHandler({ appName: 'ux' });
}

function registerApps<T extends ObservabilityFetchDataPlugins>(
  apps: Array<{ appName: T; hasData: HasData<T> }>
) {
  apps.forEach(({ appName, hasData }) => {
    registerDataHandler({
      appName,
      fetchData: () => ({} as any),
      hasData,
    });
  });
}

describe('HasDataContextProvider', () => {
  beforeAll(() => {});

  describe('when no plugin has registered', () => {
    it('hasAnyData returns undefined and all apps return undefined', async () => {
      const { result } = renderHook(() => useHasData(), { wrapper });
      expect(result.current).toMatchObject({
        hasDataMap: {},
        hasAnyData: false,
        isAllRequestsComplete: false,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });

      await waitFor(() => null);

      expect(result.current).toEqual({
        hasDataMap: {
          apm: { hasData: undefined, status: 'success' },
          uptime: { hasData: undefined, status: 'success' },
          infra_logs: { hasData: undefined, status: 'success' },
          infra_metrics: { hasData: undefined, status: 'success' },
          ux: { hasData: undefined, status: 'success' },
          alert: { hasData: false, status: 'success' },
          universal_profiling: { hasData: false, status: 'success' },
        },
        hasAnyData: false,
        isAllRequestsComplete: true,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });
    });
  });

  describe('when plugins have registered', () => {
    describe('all apps return false', () => {
      beforeAll(() => {
        registerApps([
          { appName: 'apm', hasData: async () => ({ hasData: false }) },
          {
            appName: 'infra_logs',
            hasData: async () => ({ hasData: false, indices: 'test-index' }),
          },
          { appName: 'infra_metrics', hasData: async () => ({ hasData: false }) },
          {
            appName: 'uptime',
            hasData: async () => ({ hasData: false }),
          },
          {
            appName: 'ux',
            hasData: async () => ({ hasData: false }),
          },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns false and all apps return false', async () => {
        const { result } = renderHook(() => useHasData(), { wrapper });

        expect(result.current).toEqual({
          hasDataMap: {
            universal_profiling: { hasData: false, status: 'success' },
          },
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitFor(() => null);

        expect(result.current).toEqual({
          hasDataMap: {
            apm: { hasData: false, status: 'success' },
            uptime: {
              hasData: false,
              status: 'success',
            },
            infra_logs: { hasData: false, indices: 'test-index', status: 'success' },
            infra_metrics: { hasData: false, status: 'success' },
            ux: {
              hasData: false,
              status: 'success',
            },
            alert: { hasData: false, status: 'success' },
            universal_profiling: { hasData: false, status: 'success' },
          },
          hasAnyData: false,
          isAllRequestsComplete: true,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });
      });
    });

    describe('at least one app returns true', () => {
      beforeAll(() => {
        registerApps([
          { appName: 'apm', hasData: async () => ({ hasData: true }) },
          {
            appName: 'infra_logs',
            hasData: async () => ({ hasData: false, indices: 'test-index' }),
          },
          {
            appName: 'infra_metrics',
            hasData: async () => ({ hasData: false, indices: 'metric-*' }),
          },
          {
            appName: 'uptime',
            hasData: async () => ({ hasData: false, indices: 'heartbeat-*, synthetics-*' }),
          },
          {
            appName: 'ux',
            hasData: async () => ({ hasData: false, serviceName: undefined, indices: 'apm-*' }),
          },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns true apm returns true and all other apps return false', async () => {
        const { result } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: { universal_profiling: { hasData: false, status: 'success' } },
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitFor(() => null);

        expect(result.current).toEqual({
          hasDataMap: {
            apm: { hasData: true, status: 'success' },
            uptime: {
              hasData: false,
              indices: 'heartbeat-*, synthetics-*',
              status: 'success',
            },
            infra_logs: { hasData: false, indices: 'test-index', status: 'success' },
            infra_metrics: { hasData: false, indices: 'metric-*', status: 'success' },
            ux: {
              hasData: false,
              indices: 'apm-*',
              status: 'success',
            },
            alert: { hasData: false, status: 'success' },
            universal_profiling: { hasData: false, status: 'success' },
          },
          hasAnyData: true,
          isAllRequestsComplete: true,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });
      });
    });

    describe('all apps return true', () => {
      beforeAll(() => {
        registerApps([
          { appName: 'apm', hasData: async () => ({ hasData: true }) },
          {
            appName: 'infra_logs',
            hasData: async () => ({ hasData: true, indices: 'test-index' }),
          },
          {
            appName: 'infra_metrics',
            hasData: async () => ({ hasData: true, indices: 'metric-*' }),
          },
          {
            appName: 'uptime',
            hasData: async () => ({ hasData: true, indices: 'heartbeat-*, synthetics-*' }),
          },
          {
            appName: 'ux',
            hasData: async () => ({ hasData: true, serviceName: 'ux', indices: 'apm-*' }),
          },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns true and all apps return true', async () => {
        const { result } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: { universal_profiling: { hasData: false, status: 'success' } },
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitFor(() => null);

        expect(result.current).toEqual({
          hasDataMap: {
            apm: {
              hasData: true,
              status: 'success',
            },
            uptime: {
              hasData: true,
              indices: 'heartbeat-*, synthetics-*',
              status: 'success',
            },
            infra_logs: { hasData: true, indices: 'test-index', status: 'success' },
            infra_metrics: { hasData: true, indices: 'metric-*', status: 'success' },
            ux: {
              hasData: true,
              serviceName: 'ux',
              indices: 'apm-*',
              status: 'success',
            },
            alert: { hasData: false, status: 'success' },
            universal_profiling: { hasData: false, status: 'success' },
          },
          hasAnyData: true,
          isAllRequestsComplete: true,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });
      });
    });

    describe('only apm is registered', () => {
      describe('when apm returns true', () => {
        beforeAll(() => {
          registerApps([
            { appName: 'apm', hasData: async () => ({ hasData: true, indices: sampleAPMIndices }) },
          ]);
        });

        afterAll(unregisterAll);

        it('hasAnyData returns true, apm returns true and all other apps return undefined', async () => {
          const { result } = renderHook(() => useHasData(), {
            wrapper,
          });
          expect(result.current).toEqual({
            hasDataMap: { universal_profiling: { hasData: false, status: 'success' } },
            hasAnyData: false,
            isAllRequestsComplete: false,
            forceUpdate: expect.any(String),
            onRefreshTimeRange: expect.any(Function),
          });

          await waitFor(() => null);

          expect(result.current).toEqual({
            hasDataMap: {
              apm: { hasData: true, indices: sampleAPMIndices, status: 'success' },
              uptime: { hasData: undefined, status: 'success' },
              infra_logs: { hasData: undefined, status: 'success' },
              infra_metrics: { hasData: undefined, status: 'success' },
              ux: { hasData: undefined, status: 'success' },
              alert: { hasData: false, status: 'success' },
              universal_profiling: { hasData: false, status: 'success' },
            },
            hasAnyData: true,
            isAllRequestsComplete: true,
            forceUpdate: expect.any(String),
            onRefreshTimeRange: expect.any(Function),
          });
        });
      });

      describe('when apm returns false', () => {
        beforeAll(() => {
          registerApps([
            {
              appName: 'apm',
              hasData: async () => ({ indices: sampleAPMIndices, hasData: false }),
            },
          ]);
        });

        afterAll(unregisterAll);

        it('hasAnyData returns false, apm returns false and all other apps return undefined', async () => {
          const { result } = renderHook(() => useHasData(), {
            wrapper,
          });
          expect(result.current).toEqual({
            hasDataMap: { universal_profiling: { hasData: false, status: 'success' } },
            hasAnyData: false,
            isAllRequestsComplete: false,
            forceUpdate: expect.any(String),
            onRefreshTimeRange: expect.any(Function),
          });

          await waitFor(() => null);

          expect(result.current).toEqual({
            hasDataMap: {
              apm: {
                hasData: false,
                indices: sampleAPMIndices,
                status: 'success',
              },
              uptime: { hasData: undefined, status: 'success' },
              infra_logs: { hasData: undefined, status: 'success' },
              infra_metrics: { hasData: undefined, status: 'success' },
              ux: { hasData: undefined, status: 'success' },
              alert: { hasData: false, status: 'success' },
              universal_profiling: { hasData: false, status: 'success' },
            },
            hasAnyData: false,
            isAllRequestsComplete: true,
            forceUpdate: expect.any(String),
            onRefreshTimeRange: expect.any(Function),
          });
        });
      });
    });

    describe('when an app throws an error while fetching', () => {
      beforeAll(() => {
        registerApps([
          {
            appName: 'apm',
            hasData: async () => {
              throw new Error('BOOMMMMM');
            },
          },
          {
            appName: 'infra_logs',
            hasData: async () => ({ hasData: true, indices: 'test-index' }),
          },
          {
            appName: 'infra_metrics',
            hasData: async () => ({ hasData: true, indices: 'metric-*' }),
          },
          {
            appName: 'uptime',
            hasData: async () => ({ hasData: true, indices: 'heartbeat-*, synthetics-*' }),
          },
          {
            appName: 'ux',
            hasData: async () => ({ hasData: true, serviceName: 'ux', indices: 'apm-*' }),
          },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns true, apm is undefined and all other apps return true', async () => {
        const { result } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: { universal_profiling: { hasData: false, status: 'success' } },
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitFor(() => null);

        expect(result.current).toEqual({
          hasDataMap: {
            apm: { hasData: undefined, status: 'failure' },
            uptime: {
              hasData: true,
              indices: 'heartbeat-*, synthetics-*',
              status: 'success',
            },
            infra_logs: { hasData: true, indices: 'test-index', status: 'success' },
            infra_metrics: { hasData: true, indices: 'metric-*', status: 'success' },
            ux: {
              hasData: true,
              serviceName: 'ux',
              indices: 'apm-*',
              status: 'success',
            },
            alert: { hasData: false, status: 'success' },
            universal_profiling: { hasData: false, status: 'success' },
          },
          hasAnyData: true,
          isAllRequestsComplete: true,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });
      });
    });

    describe('when all apps throw an error while fetching', () => {
      beforeAll(() => {
        registerApps([
          {
            appName: 'apm',
            hasData: async () => {
              throw new Error('BOOMMMMM');
            },
          },
          {
            appName: 'infra_logs',
            hasData: async () => {
              throw new Error('BOOMMMMM');
            },
          },
          {
            appName: 'infra_metrics',
            hasData: async () => {
              throw new Error('BOOMMMMM');
            },
          },
          {
            appName: 'uptime',
            hasData: async () => {
              throw new Error('BOOMMMMM');
            },
          },
          {
            appName: 'ux',
            hasData: async () => {
              throw new Error('BOOMMMMM');
            },
          },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns false and all apps return undefined', async () => {
        const { result } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: { universal_profiling: { hasData: false, status: 'success' } },
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitFor(() => null);

        expect(result.current).toEqual({
          hasDataMap: {
            apm: { hasData: undefined, status: 'failure' },
            uptime: { hasData: undefined, status: 'failure' },
            infra_logs: { hasData: undefined, status: 'failure' },
            infra_metrics: { hasData: undefined, status: 'failure' },
            ux: { hasData: undefined, status: 'failure' },
            alert: { hasData: false, status: 'success' },
            universal_profiling: { hasData: false, status: 'success' },
          },
          hasAnyData: false,
          isAllRequestsComplete: true,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });
      });
    });
  });

  describe('with alerts', () => {
    beforeAll(() => {
      core.http.get.mockResolvedValue({
        data: [
          { id: 2, consumer: 'apm' },
          { id: 3, consumer: 'uptime' },
        ],
      });
    });

    afterAll(() => {
      core.http.get.mockReset();
    });

    it('returns if alerts are available', async () => {
      const { result } = renderHook(() => useHasData(), { wrapper });
      expect(result.current).toEqual({
        hasDataMap: { universal_profiling: { hasData: false, status: 'success' } },
        hasAnyData: false,
        isAllRequestsComplete: false,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });

      await waitFor(() => null);

      expect(result.current).toEqual({
        hasDataMap: {
          apm: { hasData: undefined, status: 'success' },
          uptime: { hasData: undefined, status: 'success' },
          infra_logs: { hasData: undefined, status: 'success' },
          infra_metrics: { hasData: undefined, status: 'success' },
          ux: { hasData: undefined, status: 'success' },
          alert: { hasData: true, status: 'success' },
          universal_profiling: { hasData: false, status: 'success' },
        },
        hasAnyData: true,
        isAllRequestsComplete: true,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });
    });
  });
});
