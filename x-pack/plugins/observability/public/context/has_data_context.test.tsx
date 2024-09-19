/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { CoreStart } from 'kibana/public';
import React from 'react';
import { registerDataHandler, unregisterDataHandler } from '../data_handler';
import { useHasData } from '../hooks/use_has_data';
import * as routeParams from '../hooks/use_route_params';
import * as timeRange from '../hooks/use_time_range';
import { HasData, ObservabilityFetchDataPlugins } from '../typings/fetch_overview_data';
import { HasDataContextProvider } from './has_data_context';
import * as pluginContext from '../hooks/use_plugin_context';
import { PluginContextValue } from './plugin_context';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ApmIndicesConfig } from '../../common/typings';
import { act } from '@testing-library/react';

const relativeStart = '2020-10-08T06:00:00.000Z';
const relativeEnd = '2020-10-08T07:00:00.000Z';

const sampleAPMIndices = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'apm_oss.transactionIndices': 'apm-*',
} as ApmIndicesConfig;

function wrapper({ children }: { children: React.ReactElement }) {
  const history = createMemoryHistory();
  return (
    <Router history={history}>
      <HasDataContextProvider>{children}</HasDataContextProvider>
    </Router>
  );
}

function unregisterAll() {
  unregisterDataHandler({ appName: 'apm' });
  unregisterDataHandler({ appName: 'infra_logs' });
  unregisterDataHandler({ appName: 'infra_metrics' });
  unregisterDataHandler({ appName: 'synthetics' });
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
  beforeAll(() => {
    jest.spyOn(routeParams, 'useRouteParams').mockImplementation(() => ({
      query: {
        from: relativeStart,
        to: relativeEnd,
      },
      path: {},
    }));
    jest.spyOn(timeRange, 'useTimeRange').mockImplementation(() => ({
      relativeStart,
      relativeEnd,
      absoluteStart: new Date(relativeStart).valueOf(),
      absoluteEnd: new Date(relativeEnd).valueOf(),
    }));
    jest.spyOn(pluginContext, 'usePluginContext').mockReturnValue({
      core: { http: { get: jest.fn() } } as unknown as CoreStart,
    } as PluginContextValue);
  });

  describe('when no plugin has registered', () => {
    it('hasAnyData returns undefined and all apps return undefined', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
      expect(result.current).toMatchObject({
        hasDataMap: {},
        hasAnyData: undefined,
        isAllRequestsComplete: false,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });
      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current).toEqual({
        hasDataMap: {
          apm: { hasData: undefined, status: 'success' },
          synthetics: { hasData: undefined, status: 'success' },
          infra_logs: { hasData: undefined, status: 'success' },
          infra_metrics: { hasData: undefined, status: 'success' },
          ux: { hasData: undefined, status: 'success' },
          alert: { hasData: [], status: 'success' },
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
          { appName: 'infra_logs', hasData: async () => false },
          { appName: 'infra_metrics', hasData: async () => false },
          {
            appName: 'synthetics',
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
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: {},
          hasAnyData: undefined,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await act(async () => {
          await waitForNextUpdate();
        });

        expect(result.current).toEqual({
          hasDataMap: {
            apm: { hasData: false, status: 'success' },
            synthetics: {
              hasData: false,
              status: 'success',
            },
            infra_logs: { hasData: false, status: 'success' },
            infra_metrics: { hasData: false, status: 'success' },
            ux: {
              hasData: false,
              status: 'success',
            },
            alert: { hasData: [], status: 'success' },
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
          { appName: 'infra_logs', hasData: async () => false },
          { appName: 'infra_metrics', hasData: async () => false },
          {
            appName: 'synthetics',
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
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: {},
          hasAnyData: undefined,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await act(async () => {
          await waitForNextUpdate();
        });

        expect(result.current).toEqual({
          hasDataMap: {
            apm: { hasData: true, status: 'success' },
            synthetics: {
              hasData: false,
              indices: 'heartbeat-*, synthetics-*',
              status: 'success',
            },
            infra_logs: { hasData: false, status: 'success' },
            infra_metrics: { hasData: false, status: 'success' },
            ux: {
              hasData: false,
              indices: 'apm-*',
              status: 'success',
            },
            alert: { hasData: [], status: 'success' },
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
          { appName: 'infra_logs', hasData: async () => true },
          { appName: 'infra_metrics', hasData: async () => true },
          {
            appName: 'synthetics',
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
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: {},
          hasAnyData: undefined,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await act(async () => {
          await waitForNextUpdate();
        });

        expect(result.current).toEqual({
          hasDataMap: {
            apm: {
              hasData: true,
              status: 'success',
            },
            synthetics: {
              hasData: true,
              indices: 'heartbeat-*, synthetics-*',
              status: 'success',
            },
            infra_logs: { hasData: true, status: 'success' },
            infra_metrics: { hasData: true, status: 'success' },
            ux: {
              hasData: true,
              serviceName: 'ux',
              indices: 'apm-*',
              status: 'success',
            },
            alert: { hasData: [], status: 'success' },
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
          const { result, waitForNextUpdate } = renderHook(() => useHasData(), {
            wrapper,
          });
          expect(result.current).toEqual({
            hasDataMap: {},
            hasAnyData: undefined,
            isAllRequestsComplete: false,
            forceUpdate: expect.any(String),
            onRefreshTimeRange: expect.any(Function),
          });

          await act(async () => {
            await waitForNextUpdate();
          });

          expect(result.current).toEqual({
            hasDataMap: {
              apm: { hasData: true, indices: sampleAPMIndices, status: 'success' },
              synthetics: { hasData: undefined, status: 'success' },
              infra_logs: { hasData: undefined, status: 'success' },
              infra_metrics: { hasData: undefined, status: 'success' },
              ux: { hasData: undefined, status: 'success' },
              alert: { hasData: [], status: 'success' },
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
          const { result, waitForNextUpdate } = renderHook(() => useHasData(), {
            wrapper,
          });
          expect(result.current).toEqual({
            hasDataMap: {},
            hasAnyData: undefined,
            isAllRequestsComplete: false,
            forceUpdate: expect.any(String),
            onRefreshTimeRange: expect.any(Function),
          });

          await act(async () => {
            await waitForNextUpdate();
          });

          expect(result.current).toEqual({
            hasDataMap: {
              apm: {
                hasData: false,
                indices: sampleAPMIndices,
                status: 'success',
              },
              synthetics: { hasData: undefined, status: 'success' },
              infra_logs: { hasData: undefined, status: 'success' },
              infra_metrics: { hasData: undefined, status: 'success' },
              ux: { hasData: undefined, status: 'success' },
              alert: { hasData: [], status: 'success' },
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
          { appName: 'infra_logs', hasData: async () => true },
          { appName: 'infra_metrics', hasData: async () => true },
          {
            appName: 'synthetics',
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
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: {},
          hasAnyData: undefined,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await act(async () => {
          await waitForNextUpdate();
        });

        expect(result.current).toEqual({
          hasDataMap: {
            apm: { hasData: undefined, status: 'failure' },
            synthetics: {
              hasData: true,
              indices: 'heartbeat-*, synthetics-*',
              status: 'success',
            },
            infra_logs: { hasData: true, status: 'success' },
            infra_metrics: { hasData: true, status: 'success' },
            ux: {
              hasData: true,
              serviceName: 'ux',
              indices: 'apm-*',
              status: 'success',
            },
            alert: { hasData: [], status: 'success' },
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
            appName: 'synthetics',
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
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasDataMap: {},
          hasAnyData: undefined,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await act(async () => {
          await waitForNextUpdate();
        });

        expect(result.current).toEqual({
          hasDataMap: {
            apm: { hasData: undefined, status: 'failure' },
            synthetics: { hasData: undefined, status: 'failure' },
            infra_logs: { hasData: undefined, status: 'failure' },
            infra_metrics: { hasData: undefined, status: 'failure' },
            ux: { hasData: undefined, status: 'failure' },
            alert: { hasData: [], status: 'success' },
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
      jest.spyOn(pluginContext, 'usePluginContext').mockReturnValue({
        core: {
          http: {
            get: async () => {
              return {
                data: [
                  { id: 2, consumer: 'apm' },
                  { id: 3, consumer: 'uptime' },
                ],
              };
            },
          },
        } as unknown as CoreStart,
      } as PluginContextValue);
    });

    it('returns all alerts available', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
      expect(result.current).toEqual({
        hasDataMap: {},
        hasAnyData: undefined,
        isAllRequestsComplete: false,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current).toEqual({
        hasDataMap: {
          apm: { hasData: undefined, status: 'success' },
          synthetics: { hasData: undefined, status: 'success' },
          infra_logs: { hasData: undefined, status: 'success' },
          infra_metrics: { hasData: undefined, status: 'success' },
          ux: { hasData: undefined, status: 'success' },
          alert: {
            hasData: [
              { id: 2, consumer: 'apm' },
              { id: 3, consumer: 'uptime' },
            ],
            status: 'success',
          },
        },
        hasAnyData: false,
        isAllRequestsComplete: true,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });
    });
  });
});
