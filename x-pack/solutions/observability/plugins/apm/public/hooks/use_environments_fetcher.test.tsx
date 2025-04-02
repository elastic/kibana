/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useEnvironmentsFetcher } from './use_environments_fetcher';
import * as fetcherHook from './use_fetcher';
import type { Environment } from '../../common/environment_rt';
import { renderHook, waitFor } from '@testing-library/react';
import { MockApmPluginContextWrapper } from '../context/apm_plugin/mock_apm_plugin_context';

function wrapper({ children, error = false }: PropsWithChildren<{ error?: boolean }>) {
  return <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>;
}

describe('useEnvronmentsFetcher', () => {
  const callApmApi = (apisMockData: Record<string, object>) => (endpoint: string) => {
    return new Promise((resolve, _) => {
      resolve(apisMockData[endpoint]);
    });
  };
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('handles only unset environments', async () => {
    const apisMockData = {
      'GET /internal/apm/suggestions': {
        terms: [],
        hasUnset: true,
        status: fetcherHook.FETCH_STATUS.SUCCESS,
      },
    };
    jest.spyOn(fetcherHook, 'useFetcher').mockImplementation((func: Function, deps: string[]) => {
      const [data, setData] = useState({
        status: fetcherHook.FETCH_STATUS.LOADING,
        data: {
          environments: [],
        },
      });

      useEffect(() => {
        async function doFetch() {
          const newData = await func(callApmApi(apisMockData));
          setData({
            data: {
              environments: newData.environments,
            },
            status: fetcherHook.FETCH_STATUS.SUCCESS,
          });
        }
        void doFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);

      return {
        ...data,
        refetch: jest.fn(),
      };
    });

    const { result, unmount } = renderHook(
      () =>
        useEnvironmentsFetcher({
          start: '2021-08-20T10:00:00.000Z',
          end: '2021-08-20T10:15:00.000Z',
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      if (result.current.status === fetcherHook.FETCH_STATUS.LOADING) {
        throw new Error('Still loading environments');
      }
      expect(result.current.status).toEqual(fetcherHook.FETCH_STATUS.SUCCESS);
      expect(result.current.environments).toStrictEqual([
        'ENVIRONMENT_NOT_DEFINED',
      ] as Environment[]);
    });

    unmount();
  });

  it('handles no unset environments', async () => {
    const apisMockData = {
      'GET /internal/apm/suggestions': {
        terms: ['test', 'dev'],
        hasUnset: false,
        status: fetcherHook.FETCH_STATUS.SUCCESS,
      },
    };
    jest.spyOn(fetcherHook, 'useFetcher').mockImplementation((func: Function, deps: string[]) => {
      const [data, setData] = useState({
        status: fetcherHook.FETCH_STATUS.LOADING,
        data: {
          environments: [],
        },
      });

      useEffect(() => {
        async function doFetch() {
          const newData = await func(callApmApi(apisMockData));
          setData({
            data: {
              environments: newData.environments,
            },
            status: fetcherHook.FETCH_STATUS.SUCCESS,
          });
        }
        void doFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);

      return {
        ...data,
        refetch: jest.fn(),
      };
    });

    const { result, unmount } = renderHook(
      () =>
        useEnvironmentsFetcher({
          start: '2021-08-20T10:00:00.000Z',
          end: '2021-08-20T10:15:00.000Z',
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      if (result.current.status === fetcherHook.FETCH_STATUS.LOADING) {
        throw new Error('Still loading environments');
      }
      expect(result.current.status).toEqual(fetcherHook.FETCH_STATUS.SUCCESS);
      expect(result.current.environments).toStrictEqual(['test', 'dev'] as Environment[]);
    });

    unmount();
  });

  it('includes unset environments', async () => {
    const apisMockData = {
      'GET /internal/apm/suggestions': {
        terms: ['test', 'dev'],
        hasUnset: true,
        status: fetcherHook.FETCH_STATUS.SUCCESS,
      },
    };
    jest.spyOn(fetcherHook, 'useFetcher').mockImplementation((func: Function, deps: string[]) => {
      const [data, setData] = useState({
        status: fetcherHook.FETCH_STATUS.LOADING,
        data: {
          environments: [],
        },
      });

      useEffect(() => {
        async function doFetch() {
          const newData = await func(callApmApi(apisMockData));
          setData({
            data: {
              environments: newData.environments,
            },
            status: fetcherHook.FETCH_STATUS.SUCCESS,
          });
        }
        void doFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, deps);

      return {
        ...data,
        refetch: jest.fn(),
      };
    });

    const { result, unmount } = renderHook(
      () =>
        useEnvironmentsFetcher({
          start: '2021-08-20T10:00:00.000Z',
          end: '2021-08-20T10:15:00.000Z',
        }),
      {
        wrapper,
      }
    );

    await waitFor(() => {
      if (result.current.status === fetcherHook.FETCH_STATUS.LOADING) {
        throw new Error('Still loading environments');
      }
      expect(result.current.status).toEqual(fetcherHook.FETCH_STATUS.SUCCESS);
      expect(result.current.environments).toStrictEqual([
        'test',
        'dev',
        'ENVIRONMENT_NOT_DEFINED',
      ] as Environment[]);
    });

    unmount();
  });
});
