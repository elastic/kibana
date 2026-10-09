/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import { useLocation } from 'react-router-dom';
import qs from 'query-string';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';

jest.mock('../../../context/time_range_id/use_time_range_id', () => ({
  useTimeRangeId: jest.fn(),
}));

import { DatePicker } from '.';
import { useTimeRangeId } from '../../../context/time_range_id/use_time_range_id';

const mockRefreshTimeRange = jest.fn();
let mockTimeRangeId = 0;

function setMockTimeRangeId(timeRangeId: number) {
  mockTimeRangeId = timeRangeId;
  (useTimeRangeId as jest.Mock).mockReturnValue({
    incrementTimeRangeId: jest.fn(),
    timeRangeId: mockTimeRangeId,
    isAutoRefreshPaused: false,
    pauseAutoRefresh: jest.fn(),
    resumeAutoRefresh: jest.fn(),
  });
}
let history: MemoryHistory;
let mockHistoryPush: jest.SpyInstance;
let mockHistoryReplace: jest.SpyInstance;

function DatePickerWrapper() {
  const location = useLocation();
  const { rangeFrom, rangeTo, refreshInterval, refreshPaused } = qs.parse(location.search, {
    parseNumbers: true,
    parseBooleans: true,
  }) as {
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

function renderDatePicker(initialParams: {
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

  return {
    ...render(
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
    ),
    setTimeSpy,
    getTimeSpy,
  };
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
    setMockTimeRangeId(0);
  });

  it('updates the URL when the date range changes', async () => {
    const user = userEvent.setup();
    renderDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    });

    expect(mockHistoryReplace).toHaveBeenCalledTimes(0);

    const quickSelectButton = screen.getByTestId('superDatePickerToggleQuickMenuButton');
    await user.click(quickSelectButton);

    const commonlyUsedRange = screen.getByTestId('superDatePickerCommonlyUsed_Last_24 hours');
    await user.click(commonlyUsedRange);

    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: expect.stringContaining('rangeFrom=now-24h&rangeTo=now'),
      })
    );
  });

  it('enables auto-refresh when refreshPaused is false', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });

    renderDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      refreshPaused: false,
      refreshInterval: 1000,
    });

    expect(mockRefreshTimeRange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockRefreshTimeRange).toHaveBeenCalled();
    });
  });

  it('disables auto-refresh when refreshPaused is true', async () => {
    jest.useFakeTimers({ legacyFakeTimers: true });

    renderDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      refreshPaused: true,
      refreshInterval: 1000,
    });

    expect(mockRefreshTimeRange).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    });
  });

  it('remounts the picker when timeRangeId changes so relative ranges re-resolve', () => {
    setMockTimeRangeId(0);
    const { rerender } = renderDatePicker({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
    });

    const before = screen.getByTestId('superDatePickerToggleQuickMenuButton');

    // Simulate a Refresh bumping the time range id.
    setMockTimeRangeId(1);
    act(() => {
      rerender(
        <MockApmPluginContextWrapper
          value={
            {
              plugins: {
                data: {
                  query: {
                    timefilter: {
                      timefilter: { setTime: jest.fn(), getTime: jest.fn().mockReturnValue({}) },
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
    });

    const after = screen.getByTestId('superDatePickerToggleQuickMenuButton');

    // A changed `key` forces React to unmount the previous EuiSuperDatePicker and
    // mount a fresh one, which re-resolves `now-15m`/`now` to current wall-clock
    // bounds instead of reusing the stale absolute preview.
    expect(after).not.toBe(before);
  });

  it('sets time when both rangeTo and rangeFrom are provided', async () => {
    const { setTimeSpy } = renderDatePicker({
      rangeTo: 'now-20m',
      rangeFrom: 'now-22m',
    });

    expect(setTimeSpy).toHaveBeenCalledWith({
      to: 'now-20m',
      from: 'now-22m',
    });
    expect(mockHistoryReplace).toHaveBeenCalledTimes(0);
  });
});
