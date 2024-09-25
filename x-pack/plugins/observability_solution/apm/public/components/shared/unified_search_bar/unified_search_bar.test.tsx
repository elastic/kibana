/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import { createMemoryHistory, MemoryHistory } from 'history';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { UnifiedSearchBar } from '.';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { UrlParams } from '../../../context/url_params_context/types';
import * as useApmDataViewHook from '../../../hooks/use_adhoc_apm_data_view';
import * as useApmParamsHook from '../../../hooks/use_apm_params';
import * as useFetcherHook from '../../../hooks/use_fetcher';
import * as useProcessorEventHook from '../../../hooks/use_processor_event';
import { fromQuery } from '../links/url_helpers';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

function setup({ urlParams, history }: { urlParams: UrlParams; history: MemoryHistory }) {
  history.replace({
    pathname: '/services',
    search: fromQuery(urlParams),
  });

  const setQuerySpy = jest.fn();
  const getQuerySpy = jest.fn();
  const clearQuerySpy = jest.fn();
  const setTimeSpy = jest.fn();
  const setRefreshIntervalSpy = jest.fn();

  // mock transaction types
  jest.spyOn(useApmDataViewHook, 'useAdHocApmDataView').mockReturnValue({ dataView: undefined });

  jest.spyOn(useFetcherHook, 'useFetcher').mockReturnValue({} as any);

  const wrapper = mount(
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
      <UnifiedSearchBar />
    </MockApmPluginContextWrapper>
  );

  return {
    wrapper,
    setQuerySpy,
    getQuerySpy,
    clearQuerySpy,
    setTimeSpy,
    setRefreshIntervalSpy,
  };
}

describe('when kuery is already present in the url, the search bar must reflect the same', () => {
  let history: MemoryHistory;
  beforeEach(() => {
    history = createMemoryHistory();
    jest.spyOn(history, 'push');
    jest.spyOn(history, 'replace');
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  jest.spyOn(useProcessorEventHook, 'useProcessorEvent').mockReturnValue(undefined);

  const search = '?method=json';
  const pathname = '/services';
  (useLocation as jest.Mock).mockImplementationOnce(() => ({
    search,
    pathname,
  }));

  it('sets the searchbar value based on URL', () => {
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

    const { setQuerySpy, setTimeSpy, setRefreshIntervalSpy } = setup({
      history,
      urlParams,
    });

    expect(setQuerySpy).toBeCalledWith(expectedQuery);
    expect(setTimeSpy).toBeCalledWith(expectedTimeRange);
    expect(setRefreshIntervalSpy).toBeCalledWith(refreshInterval);
  });
});
