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
import React from 'react';
import { useLocation } from 'react-router-dom';
import qs from 'query-string';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { DatePicker } from './';

let history: MemoryHistory;

const mockRefreshTimeRange = jest.fn();
let mockHistoryPush: jest.SpyInstance;
let mockHistoryReplace: jest.SpyInstance;

function DatePickerWrapper() {
  const location = useLocation();

  const { rangeFrom, rangeTo, refreshInterval, refreshPaused } = qs.parse(
    location.search,
    {
      parseNumbers: true,
      parseBooleans: true,
    }
  ) as {
    rangeFrom?: string;
    rangeTo?: string;
    refreshInterval?: number;
    refreshPaused?: boolean;
  };

  return (
    <DatePicker
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      refreshInterval={refreshInterval}
      refreshPaused={refreshPaused}
      onTimeRangeRefresh={mockRefreshTimeRange}
    />
  );
}

function mountDatePicker(initialParams: {
  rangeFrom?: string;
  rangeTo?: string;
  refreshInterval?: number;
  refreshPaused?: boolean;
}) {
  const setTimeSpy = jest.fn();
  const getTimeSpy = jest.fn().mockReturnValue({});

  history = createMemoryHistory({
    initialEntries: [`/?${qs.stringify(initialParams)}`],
  });

  mockHistoryPush = jest.spyOn(history, 'push');
  mockHistoryReplace = jest.spyOn(history, 'replace');

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
      history={history}
    >
      <DatePickerWrapper />
    </MockApmPluginContextWrapper>
  );

  return { wrapper, setTimeSpy, getTimeSpy };
}

describe('DatePicker', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => null);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('updates the URL when the date range changes', () => {
    const { wrapper } = mountDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    });

    expect(mockHistoryReplace).toHaveBeenCalledTimes(0);

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
      rangeFrom: 'now-15m',
      rangeTo: 'now',
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
    mountDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      refreshPaused: true,
      refreshInterval: 1000,
    });
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
});
