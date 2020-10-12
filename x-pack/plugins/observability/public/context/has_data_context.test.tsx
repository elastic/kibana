/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// import { act, getByText } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { registerDataHandler, unregisterDataHandler } from '../data_handler';
import { useHasData } from '../hooks/use_has_data';
import * as routeParams from '../hooks/use_route_params';
import * as timeRange from '../hooks/use_time_range';
import { HasData, ObservabilityFetchDataPlugins } from '../typings/fetch_overview_data';
import { HasDataContextProvider } from './has_data_context';

const rangeFrom = '2020-10-08T06:00:00.000Z';
const rangeTo = '2020-10-08T07:00:00.000Z';

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
        from: rangeFrom,
        to: rangeTo,
      },
      path: {},
    }));
    jest.spyOn(timeRange, 'useTimeRange').mockImplementation(() => ({
      rangeFrom,
      rangeTo,
      absStart: new Date(rangeFrom).valueOf(),
      absEnd: new Date(rangeTo).valueOf(),
    }));
  });

  describe('when no plugin has registered', () => {
    it('hasAnyData returns false and all apps return undefined', () => {
      const { result } = renderHook(() => useHasData(), { wrapper });
      expect(result.current).toEqual({
        hasData: {
          apm: undefined,
          infra_logs: undefined,
          infra_metrics: undefined,
          uptime: undefined,
          ux: undefined,
        },
        hasAnyData: false,
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
          const { result, waitForNextUpdate } = renderHook(() => useHasDataContext(), { wrapper });
          expect(result.current).toEqual({
            hasData: {
              apm: undefined,
              infra_logs: undefined,
              infra_metrics: undefined,
              uptime: undefined,
              ux: undefined,
            },
            hasAnyData: undefined,
          });

          await waitForNextUpdate();

          expect(result.current).toEqual({
            hasData: {
              apm: false,
              infra_logs: false,
              infra_metrics: false,
              uptime: false,
              ux: { hasData: false, serviceName: undefined },
            },
            hasAnyData: false,
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
          const { result, waitForNextUpdate } = renderHook(() => useHasDataContext(), { wrapper });
          expect(result.current).toEqual({
            hasData: {
              apm: undefined,
              infra_logs: undefined,
              infra_metrics: undefined,
              uptime: undefined,
              ux: undefined,
            },
            hasAnyData: undefined,
          });

          await waitForNextUpdate();

          expect(result.current).toEqual({
            hasData: {
              apm: true,
              infra_logs: false,
              infra_metrics: false,
              uptime: false,
              ux: { hasData: false, serviceName: undefined },
            },
            hasAnyData: true,
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
          const { result, waitForNextUpdate } = renderHook(() => useHasDataContext(), { wrapper });
          expect(result.current).toEqual({
            hasData: {
              apm: undefined,
              infra_logs: undefined,
              infra_metrics: undefined,
              uptime: undefined,
              ux: undefined,
            },
            hasAnyData: undefined,
          });

          await waitForNextUpdate();

          expect(result.current).toEqual({
            hasData: {
              apm: true,
              infra_logs: true,
              infra_metrics: true,
              uptime: true,
              ux: { hasData: true, serviceName: 'ux' },
            },
            hasAnyData: true,
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
            const { result, waitForNextUpdate } = renderHook(() => useHasDataContext(), {
              wrapper,
            });
            expect(result.current).toEqual({
              hasData: {
                apm: undefined,
                infra_logs: undefined,
                infra_metrics: undefined,
                uptime: undefined,
                ux: undefined,
              },
              hasAnyData: undefined,
            });

            await waitForNextUpdate();

            expect(result.current).toEqual({
              hasData: {
                apm: true,
                infra_logs: undefined,
                infra_metrics: undefined,
                uptime: undefined,
                ux: undefined,
              },
              hasAnyData: true,
            });
          });
        });

        describe('when apm returns false', () => {
          beforeAll(() => {
            registerApps([{ appName: 'apm', hasData: async () => false }]);
          });

          afterAll(unregisterAll);

          it('hasAnyData returns false, apm returns false and all other apps return undefined', async () => {
            const { result, waitForNextUpdate } = renderHook(() => useHasDataContext(), {
              wrapper,
            });
            expect(result.current).toEqual({
              hasData: {
                apm: undefined,
                infra_logs: undefined,
                infra_metrics: undefined,
                uptime: undefined,
                ux: undefined,
              },
              hasAnyData: undefined,
            });

            await waitForNextUpdate();

            expect(result.current).toEqual({
              hasData: {
                apm: false,
                infra_logs: undefined,
                infra_metrics: undefined,
                uptime: undefined,
                ux: undefined,
              },
              hasAnyData: false,
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
          const { result, waitForNextUpdate } = renderHook(() => useHasDataContext(), { wrapper });
          expect(result.current).toEqual({
            hasData: {
              apm: undefined,
              infra_logs: undefined,
              infra_metrics: undefined,
              uptime: undefined,
              ux: undefined,
            },
            hasAnyData: undefined,
          });

          await waitForNextUpdate();

          expect(result.current).toEqual({
            hasData: {
              apm: undefined,
              infra_logs: true,
              infra_metrics: true,
              uptime: true,
              ux: { hasData: true, serviceName: 'ux' },
            },
            hasAnyData: true,
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
          const { result, waitForNextUpdate } = renderHook(() => useHasDataContext(), { wrapper });
          expect(result.current).toEqual({
            hasData: {
              apm: undefined,
              infra_logs: undefined,
              infra_metrics: undefined,
              uptime: undefined,
              ux: undefined,
            },
            hasAnyData: undefined,
          });

          await waitForNextUpdate();

          expect(result.current).toEqual({
            hasData: {
              apm: undefined,
              infra_logs: undefined,
              infra_metrics: undefined,
              uptime: undefined,
              ux: undefined,
            },
            hasAnyData: false,
          });
        });
      });
    });
  });
});
