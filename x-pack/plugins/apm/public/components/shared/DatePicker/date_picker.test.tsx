/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import { createMemoryHistory } from 'history';
import React, { ReactNode } from 'react';
import { Router } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import {
  UrlParamsContext,
  useUiFilters,
} from '../../../context/url_params_context/url_params_context';
import { IUrlParams } from '../../../context/url_params_context/types';
import { DatePicker } from './';

const history = createMemoryHistory();

const mockRefreshTimeRange = jest.fn();
function MockUrlParamsProvider({
  urlParams = {},
  children,
}: {
  children: ReactNode;
  urlParams?: IUrlParams;
}) {
  return (
    <UrlParamsContext.Provider
      value={{
        urlParams,
        refreshTimeRange: mockRefreshTimeRange,
        uiFilters: useUiFilters(urlParams),
      }}
      children={children}
    />
  );
}

function mountDatePicker(urlParams?: IUrlParams) {
  const setTimeSpy = jest.fn();
  const getTimeSpy = jest.fn().mockReturnValue({});
  const wrapper = mount(
    <MockApmPluginContextWrapper
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
      <Router history={history}>
        <MockUrlParamsProvider urlParams={urlParams}>
          <DatePicker />
        </MockUrlParamsProvider>
      </Router>
    </MockApmPluginContextWrapper>
  );

  return { wrapper, setTimeSpy, getTimeSpy };
}

describe('DatePicker', () => {
  let mockHistoryPush: jest.SpyInstance;
  let mockHistoryReplace: jest.SpyInstance;
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
    mockHistoryPush = jest.spyOn(history, 'push');
    mockHistoryReplace = jest.spyOn(history, 'replace');
  });

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
      expect.objectContaining({ search: 'rangeFrom=now-15m&rangeTo=now' })
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
      start: 'updated-start',
      end: 'updated-end',
      isInvalid: false,
      isQuickSelection: true,
    });
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'rangeFrom=updated-start&rangeTo=updated-end',
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
    jest.advanceTimersByTime(1000);
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
    let setTimeSpy: jest.Mock;
    beforeEach(() => {
      const res = mountDatePicker({ rangeTo: 'now-5m' });
      setTimeSpy = res.setTimeSpy;
    });

    it('does not call setTime', async () => {
      expect(setTimeSpy).toHaveBeenCalledTimes(0);
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
