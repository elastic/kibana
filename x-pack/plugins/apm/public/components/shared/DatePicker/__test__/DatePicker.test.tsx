/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import { wait } from '@testing-library/react';
import { mount } from 'enzyme';
import { createMemoryHistory } from 'history';
import React, { ReactNode } from 'react';
import { Router } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';
import { LocationProvider } from '../../../../context/LocationContext';
import {
  UrlParamsContext,
  useUiFilters,
} from '../../../../context/UrlParamsContext';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { DatePicker } from '../index';

const history = createMemoryHistory();
const mockHistoryPush = jest.spyOn(history, 'push');
const mockHistoryReplace = jest.spyOn(history, 'replace');
const mockRefreshTimeRange = jest.fn();
function MockUrlParamsProvider({
  params = {},
  children,
}: {
  children: ReactNode;
  params?: IUrlParams;
}) {
  return (
    <UrlParamsContext.Provider
      value={{
        urlParams: params,
        refreshTimeRange: mockRefreshTimeRange,
        uiFilters: useUiFilters(params),
      }}
      children={children}
    />
  );
}

function mountDatePicker(params?: IUrlParams) {
  return mount(
    <MockApmPluginContextWrapper>
      <Router history={history}>
        <LocationProvider>
          <MockUrlParamsProvider params={params}>
            <DatePicker />
          </MockUrlParamsProvider>
        </LocationProvider>
      </Router>
    </MockApmPluginContextWrapper>
  );
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

  it('sets default query params in the URL', () => {
    mountDatePicker();
    expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
    expect(mockHistoryReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'rangeFrom=now-15m&rangeTo=now',
      })
    );
  });

  it('adds missing default value', () => {
    mountDatePicker({
      rangeTo: 'now',
      refreshInterval: 5000,
    });
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
    const datePicker = mountDatePicker();
    expect(mockHistoryReplace).toHaveBeenCalledTimes(1);
    datePicker.find(EuiSuperDatePicker).props().onTimeChange({
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
    const wrapper = mountDatePicker({
      refreshPaused: false,
      refreshInterval: 1000,
    });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await wait();
    expect(mockRefreshTimeRange).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('disables auto-refresh when refreshPaused is true', async () => {
    jest.useFakeTimers();
    mountDatePicker({ refreshPaused: true, refreshInterval: 1000 });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await wait();
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
  });
});
