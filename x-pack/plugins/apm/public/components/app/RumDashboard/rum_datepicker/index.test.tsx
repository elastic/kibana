/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import { createMemoryHistory, MemoryHistory } from 'history';
import React, { ReactNode } from 'react';
import qs from 'query-string';
import { MockApmPluginContextWrapper } from '../../../../context/apm_plugin/mock_apm_plugin_context';
import { UrlParamsContext } from '../../../../context/url_params_context/url_params_context';
import { RumDatePicker } from './';
import { useLocation } from 'react-router-dom';

let history: MemoryHistory;
let mockHistoryPush: jest.SpyInstance;
let mockHistoryReplace: jest.SpyInstance;

const mockRefreshTimeRange = jest.fn();

function MockUrlParamsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();

  const urlParams = qs.parse(location.search, {
    parseBooleans: true,
    parseNumbers: true,
  });

  return (
    <UrlParamsContext.Provider
      value={{
        rangeId: 0,
        refreshTimeRange: mockRefreshTimeRange,
        urlParams,
        uxUiFilters: {},
      }}
      children={children}
    />
  );
}

function mountDatePicker(
  params: {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
  } = {}
) {
  const setTimeSpy = jest.fn();
  const getTimeSpy = jest.fn().mockReturnValue({});

  history = createMemoryHistory({
    initialEntries: [`/?${qs.stringify(params)}`],
  });

  jest.spyOn(console, 'error').mockImplementation(() => null);
  mockHistoryPush = jest.spyOn(history, 'push');
  mockHistoryReplace = jest.spyOn(history, 'replace');

  const wrapper = mount(
    <MockApmPluginContextWrapper
      history={history}
      value={
        {
          plugins: {
            data: {
              query: {
                timefilter: {
                  timefilter: { setTime: setTimeSpy, getTime: getTimeSpy },
                },
              },
            },
          },
        } as any
      }
    >
      <MockUrlParamsProvider>
        <RumDatePicker />
      </MockUrlParamsProvider>
    </MockApmPluginContextWrapper>
  );

  return { wrapper, setTimeSpy, getTimeSpy };
}

describe('RumDatePicker', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('sets default query params in the URL', () => {
    mountDatePicker();
    expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockHistoryReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'rangeFrom=now-15m&rangeTo=now',
      })
    );
  });

  it('adds missing `rangeFrom` to url', () => {
    mountDatePicker({ rangeTo: 'now', refreshInterval: 5000 });
    expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockHistoryReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'rangeFrom=now-15m&rangeTo=now&refreshInterval=5000',
      })
    );
  });

  it('does not set default query params in the URL when values already defined', () => {
    mountDatePicker({
      rangeFrom: 'now-1d',
      rangeTo: 'now',
      refreshPaused: false,
      refreshInterval: 5000,
    });
    expect(mockHistoryReplace).toHaveBeenCalledTimes(0);
  });

  it('updates the URL when the date range changes', () => {
    const { wrapper } = mountDatePicker();

    expect(mockHistoryReplace).toHaveBeenCalledTimes(1);

    wrapper.find(EuiSuperDatePicker).props().onTimeChange({
      start: 'now-90m',
      end: 'now-60m',
      isInvalid: false,
      isQuickSelection: true,
    });
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'rangeFrom=now-90m&rangeTo=now-60m',
      })
    );
  });

  it('enables auto-refresh when refreshPaused is false', async () => {
    jest.useFakeTimers();
    const { wrapper } = mountDatePicker({
      refreshPaused: false,
      refreshInterval: 1000,
    });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2500);
    await waitFor(() => {});
    expect(mockRefreshTimeRange).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('disables auto-refresh when refreshPaused is true', async () => {
    jest.useFakeTimers();
    mountDatePicker({ refreshPaused: true, refreshInterval: 1000 });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await waitFor(() => {});
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
  });

  describe('if both `rangeTo` and `rangeFrom` is set', () => {
    it('calls setTime ', async () => {
      const { setTimeSpy } = mountDatePicker({
        rangeTo: 'now-20m',
        rangeFrom: 'now-22m',
      });
      expect(setTimeSpy).toHaveBeenCalledWith({
        to: 'now-20m',
        from: 'now-22m',
      });
    });

    it('does not update the url', () => {
      expect(mockHistoryReplace).toHaveBeenCalledTimes(0);
    });
  });

  describe('if `rangeFrom` is missing from the urlParams', () => {
    beforeEach(() => {
      mountDatePicker({ rangeTo: 'now-5m' });
    });

    it('updates the url with the default `rangeFrom` ', async () => {
      expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
      expect(mockHistoryReplace.mock.calls[0][0].search).toContain(
        'rangeFrom=now-15m'
      );
    });

    it('preserves `rangeTo`', () => {
      expect(mockHistoryReplace.mock.calls[0][0].search).toContain(
        'rangeTo=now-5m'
      );
    });
  });
});
