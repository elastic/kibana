/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react-hooks';
import { MockRouter, MockKibanaProvider } from '../../../lib/helper/rtl_helpers';
import { SyntaxType, useQueryBar, DEBOUNCE_INTERVAL } from './use_query_bar';
import { MountWithReduxProvider } from '../../../lib';
import * as URL from '../../../hooks/use_url_params';
import * as ES_FILTERS from '../../../hooks/update_kuery_string';
import { UptimeUrlParams } from '../../../lib/helper/url_params';

const SAMPLE_ES_FILTERS = `{"bool":{"should":[{"match_phrase":{"monitor.id":"NodeServer"}}],"minimum_should_match":1}}`;

// FLAKY: https://github.com/elastic/kibana/issues/112677
describe.skip('useQueryBar', () => {
  let DEFAULT_URL_PARAMS: UptimeUrlParams;
  let wrapper: any;
  let useUrlParamsSpy: jest.SpyInstance<[URL.GetUrlParams, URL.UpdateUrlParams]>;
  let useGetUrlParamsSpy: jest.SpyInstance<UptimeUrlParams>;
  let updateUrlParamsMock: jest.Mock;
  let useUpdateKueryStringSpy: jest.SpyInstance;

  beforeEach(() => {
    DEFAULT_URL_PARAMS = {
      absoluteDateRangeStart: 100,
      absoluteDateRangeEnd: 200,
      autorefreshInterval: 10000,
      autorefreshIsPaused: true,
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      excludedFilters: '',
      filters: '',
      query: '',
      search: 'monitor.id: "My-Monitor"',
      statusFilter: '',
    };
    wrapper = ({ children }: any) => (
      <MountWithReduxProvider>
        <MockKibanaProvider>
          <MockRouter>{children}</MockRouter>
        </MockKibanaProvider>
      </MountWithReduxProvider>
    );
    useUrlParamsSpy = jest.spyOn(URL, 'useUrlParams');
    useGetUrlParamsSpy = jest.spyOn(URL, 'useGetUrlParams');
    useUpdateKueryStringSpy = jest.spyOn(ES_FILTERS, 'generateUpdatedKueryString');
    updateUrlParamsMock = jest.fn();

    useUrlParamsSpy.mockImplementation(() => [jest.fn(), updateUrlParamsMock]);
    useGetUrlParamsSpy.mockReturnValue(DEFAULT_URL_PARAMS);
    useUpdateKueryStringSpy.mockReturnValue([SAMPLE_ES_FILTERS]);
  });

  it.each([
    [SyntaxType.text, undefined, SAMPLE_ES_FILTERS, '', 'monitor.id: "My-Other-Monitor"', false, 0],
    [
      SyntaxType.kuery,
      new Error('there was a problem'),
      SAMPLE_ES_FILTERS,
      '',
      'monitor.id: "My-Other-Monitor"',
      false,
      0,
    ],
    [SyntaxType.kuery, undefined, undefined, '', 'monitor.id: "My-Other-Monitor"', false, 0],
    [SyntaxType.text, undefined, undefined, '', 'monitor.id: "My-Other-Monitor"', false, 0],
    [SyntaxType.text, undefined, undefined, 'my-search', 'monitor.id: "My-Other-Monitor"', true, 1],
    [SyntaxType.kuery, undefined, undefined, 'my-search', '', true, 1],
    [
      SyntaxType.kuery,
      undefined,
      SAMPLE_ES_FILTERS,
      'my-search',
      'monitor.id: "My-Monitor"',
      true,
      1,
    ],
  ])(
    'updates URL only when conditions are appropriate',
    /**
     * This test is designed to prevent massive duplication of boilerplate; each set of parameters should trigger
     * a different response from the hook. At the end, we wait for the debounce interval to elapse and then check
     * whether the URL was updated.
     *
     * @param language the query syntax
     * @param error an error resulting from parsing es filters
     * @param esFilters the AST string generated from parsing kuery syntax
     * @param search the simple text search
     * @param query the new kuery entered by the user
     * @param shouldExpectCall boolean denoting whether or not the test should expect the url to be updated
     * @param calledTimes the number of times the test should expect the url to be updated
     */
    async (language, error, esFilters, search, query, shouldExpectCall, calledTimes) => {
      const {
        result: { current },
      } = renderHook(() => useQueryBar(), { wrapper });

      useUpdateKueryStringSpy.mockReturnValue([esFilters, error]);
      useGetUrlParamsSpy.mockReturnValue({
        ...DEFAULT_URL_PARAMS,
        search,
      });

      act(() => {
        current.setQuery({
          query,
          language,
        });
      });

      await waitFor(async () => {
        await new Promise((r) => setInterval(r, DEBOUNCE_INTERVAL + 50));
        if (shouldExpectCall) {
          expect(updateUrlParamsMock).toHaveBeenCalledTimes(calledTimes);
        } else {
          expect(updateUrlParamsMock).not.toHaveBeenCalled();
        }
      });
    }
  );
});
