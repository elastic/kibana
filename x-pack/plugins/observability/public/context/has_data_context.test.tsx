/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// import { act, getByText } from '@testing-library/react';
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

const relativeStart = '2020-10-08T06:00:00.000Z';
const relativeEnd = '2020-10-08T07:00:00.000Z';

function wrapper({ children }: { children: React.ReactElement }) {
  return <HasDataContextProvider>{children}</HasDataContextProvider>;
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
      core: ({ http: { get: jest.fn() } } as unknown) as CoreStart,
    } as PluginContextValue);
  });

  describe('when no plugin has registered', () => {
    it('hasAnyData returns false and all apps return undefined', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
      expect(result.current).toMatchObject({
        hasData: {},
        hasAnyData: false,
        isAllRequestsComplete: false,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });

      await waitForNextUpdate();

      expect(result.current).toEqual({
        hasData: {
          apm: { hasData: undefined, status: 'success' },
          uptime: { hasData: undefined, status: 'success' },
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
          { appName: 'apm', hasData: async () => false },
          { appName: 'infra_logs', hasData: async () => false },
          { appName: 'infra_metrics', hasData: async () => false },
          { appName: 'uptime', hasData: async () => false },
          { appName: 'ux', hasData: async () => ({ hasData: false, serviceName: undefined }) },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns false and all apps return false', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasData: {},
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitForNextUpdate();

        expect(result.current).toEqual({
          hasData: {
            apm: { hasData: false, status: 'success' },
            uptime: { hasData: false, status: 'success' },
            infra_logs: { hasData: false, status: 'success' },
            infra_metrics: { hasData: false, status: 'success' },
            ux: { hasData: { hasData: false, serviceName: undefined }, status: 'success' },
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
          { appName: 'apm', hasData: async () => true },
          { appName: 'infra_logs', hasData: async () => false },
          { appName: 'infra_metrics', hasData: async () => false },
          { appName: 'uptime', hasData: async () => false },
          { appName: 'ux', hasData: async () => ({ hasData: false, serviceName: undefined }) },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns true apm returns true and all other apps return false', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasData: {},
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitForNextUpdate();

        expect(result.current).toEqual({
          hasData: {
            apm: { hasData: true, status: 'success' },
            uptime: { hasData: false, status: 'success' },
            infra_logs: { hasData: false, status: 'success' },
            infra_metrics: { hasData: false, status: 'success' },
            ux: { hasData: { hasData: false, serviceName: undefined }, status: 'success' },
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
          { appName: 'apm', hasData: async () => true },
          { appName: 'infra_logs', hasData: async () => true },
          { appName: 'infra_metrics', hasData: async () => true },
          { appName: 'uptime', hasData: async () => true },
          { appName: 'ux', hasData: async () => ({ hasData: true, serviceName: 'ux' }) },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns true and all apps return true', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasData: {},
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitForNextUpdate();

        expect(result.current).toEqual({
          hasData: {
            apm: { hasData: true, status: 'success' },
            uptime: { hasData: true, status: 'success' },
            infra_logs: { hasData: true, status: 'success' },
            infra_metrics: { hasData: true, status: 'success' },
            ux: { hasData: { hasData: true, serviceName: 'ux' }, status: 'success' },
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
          registerApps([{ appName: 'apm', hasData: async () => true }]);
        });

        afterAll(unregisterAll);

        it('hasAnyData returns true, apm returns true and all other apps return undefined', async () => {
          const { result, waitForNextUpdate } = renderHook(() => useHasData(), {
            wrapper,
          });
          expect(result.current).toEqual({
            hasData: {},
            hasAnyData: false,
            isAllRequestsComplete: false,
            forceUpdate: expect.any(String),
            onRefreshTimeRange: expect.any(Function),
          });

          await waitForNextUpdate();

          expect(result.current).toEqual({
            hasData: {
              apm: { hasData: true, status: 'success' },
              uptime: { hasData: undefined, status: 'success' },
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
          registerApps([{ appName: 'apm', hasData: async () => false }]);
        });

        afterAll(unregisterAll);

        it('hasAnyData returns false, apm returns false and all other apps return undefined', async () => {
          const { result, waitForNextUpdate } = renderHook(() => useHasData(), {
            wrapper,
          });
          expect(result.current).toEqual({
            hasData: {},
            hasAnyData: false,
            isAllRequestsComplete: false,
            forceUpdate: expect.any(String),
            onRefreshTimeRange: expect.any(Function),
          });

          await waitForNextUpdate();

          expect(result.current).toEqual({
            hasData: {
              apm: { hasData: false, status: 'success' },
              uptime: { hasData: undefined, status: 'success' },
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
          { appName: 'uptime', hasData: async () => true },
          { appName: 'ux', hasData: async () => ({ hasData: true, serviceName: 'ux' }) },
        ]);
      });

      afterAll(unregisterAll);

      it('hasAnyData returns true, apm is undefined and all other apps return true', async () => {
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasData: {},
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitForNextUpdate();

        expect(result.current).toEqual({
          hasData: {
            apm: { hasData: undefined, status: 'failure' },
            uptime: { hasData: true, status: 'success' },
            infra_logs: { hasData: true, status: 'success' },
            infra_metrics: { hasData: true, status: 'success' },
            ux: { hasData: { hasData: true, serviceName: 'ux' }, status: 'success' },
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
        const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
        expect(result.current).toEqual({
          hasData: {},
          hasAnyData: false,
          isAllRequestsComplete: false,
          forceUpdate: expect.any(String),
          onRefreshTimeRange: expect.any(Function),
        });

        await waitForNextUpdate();

        expect(result.current).toEqual({
          hasData: {
            apm: { hasData: undefined, status: 'failure' },
            uptime: { hasData: undefined, status: 'failure' },
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
        core: ({
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
        } as unknown) as CoreStart,
      } as PluginContextValue);
    });

    it('returns all alerts available', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useHasData(), { wrapper });
      expect(result.current).toEqual({
        hasData: {},
        hasAnyData: false,
        isAllRequestsComplete: false,
        forceUpdate: expect.any(String),
        onRefreshTimeRange: expect.any(Function),
      });

      await waitForNextUpdate();

      expect(result.current).toEqual({
        hasData: {
          apm: { hasData: undefined, status: 'success' },
          uptime: { hasData: undefined, status: 'success' },
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
