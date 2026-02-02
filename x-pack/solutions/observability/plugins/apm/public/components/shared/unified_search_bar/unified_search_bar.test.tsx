/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import { useLocation } from 'react-router-dom';
import { UnifiedSearchBar } from '.';
import type { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import type { UrlParams } from '../../../context/url_params_context/types';
import * as useApmDataViewHook from '../../../hooks/use_adhoc_apm_data_view';
import * as useApmParamsHook from '../../../hooks/use_apm_params';
import * as useFetcherHook from '../../../hooks/use_fetcher';
import * as useProcessorEventHook from '../../../hooks/use_processor_event';
import { fromQuery } from '../links/url_helpers';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

interface SetupResult {
  setQuerySpy: jest.SpyInstance;
  getQuerySpy: jest.SpyInstance;
  clearQuerySpy: jest.SpyInstance;
  setTimeSpy: jest.SpyInstance;
  setRefreshIntervalSpy: jest.SpyInstance;
}

async function setup({
  urlParams,
  history,
}: {
  urlParams: UrlParams;
  history: MemoryHistory;
}): Promise<SetupResult> {
  history.replace({
    pathname: '/services',
    search: fromQuery(urlParams),
  });

  const setQuerySpy = jest.fn();
  const getQuerySpy = jest.fn();
  const clearQuerySpy = jest.fn();
  const setTimeSpy = jest.fn();
  const setRefreshIntervalSpy = jest.fn();

  jest
    .spyOn(useApmDataViewHook, 'useAdHocApmDataView')
    .mockReturnValue({ dataView: undefined, apmIndices: undefined });
  jest.spyOn(useFetcherHook, 'useFetcher').mockReturnValue({} as any);

  render(
    <MockApmPluginContextWrapper
      history={history}
      value={
        {
          core: {
            usageCollection: {
              reportUiCounter: () => {},
            },
            dataViews: {
              get: async () => {},
            },
            data: {
              query: {
                queryString: {
                  setQuery: setQuerySpy,
                  getQuery: getQuerySpy,
                  clearQuery: clearQuerySpy,
                },
                timefilter: {
                  timefilter: {
                    setTime: setTimeSpy,
                    setRefreshInterval: setRefreshIntervalSpy,
                  },
                },
              },
            },
          },
        } as unknown as ApmPluginContextValue
      }
    >
      <PerformanceContextProvider>
        <UnifiedSearchBar />
      </PerformanceContextProvider>
    </MockApmPluginContextWrapper>
  );

  return {
    setQuerySpy,
    getQuerySpy,
    clearQuerySpy,
    setTimeSpy,
    setRefreshIntervalSpy,
  };
}

describe('UnifiedSearchBar', () => {
  let history: MemoryHistory;

  beforeEach(() => {
    history = createMemoryHistory();
    jest.spyOn(history, 'push');
    jest.spyOn(history, 'replace');
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('sets search bar state based on URL parameters', async () => {
    jest.spyOn(useProcessorEventHook, 'useProcessorEvent').mockReturnValue(undefined);

    const search = '?method=json';
    const pathname = '/services';
    (useLocation as jest.Mock).mockReturnValue({ search, pathname });

    const expectedQuery = {
      query: 'service.name:"opbeans-android"',
      language: 'kuery',
    };

    const expectedTimeRange = {
      from: 'now-15m',
      to: 'now',
    };

    const refreshInterval = {
      pause: false,
      value: 5000,
    };

    const urlParams = {
      kuery: expectedQuery.query,
      rangeFrom: expectedTimeRange.from,
      rangeTo: expectedTimeRange.to,
      environment: 'ENVIRONMENT_ALL',
      comparisonEnabled: true,
      serviceGroup: '',
      offset: '1d',
      refreshPaused: refreshInterval.pause,
      refreshInterval: refreshInterval.value,
    };

    jest.spyOn(useApmParamsHook, 'useApmParams').mockReturnValue({ query: urlParams, path: {} });

    const { setQuerySpy, setTimeSpy, setRefreshIntervalSpy } = await setup({
      history,
      urlParams,
    });

    await waitFor(() => {
      expect(setQuerySpy).toHaveBeenCalledWith(expectedQuery);
      expect(setTimeSpy).toHaveBeenCalledWith(expectedTimeRange);
      expect(setRefreshIntervalSpy).toHaveBeenCalledWith(refreshInterval);
    });
  });
});
