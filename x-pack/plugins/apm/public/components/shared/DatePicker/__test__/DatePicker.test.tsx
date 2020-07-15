/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LocationProvider } from '../../../../context/LocationContext';
import {
  UrlParamsContext,
  useUiFilters,
} from '../../../../context/UrlParamsContext';
import { DatePicker } from '../index';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { history } from '../../../../utils/history';
import { mount } from 'enzyme';
import { EuiSuperDatePicker } from '@elastic/eui';
import { MemoryRouter } from 'react-router-dom';
import { wait } from '@testing-library/react';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';

const mockHistoryPush = jest.spyOn(history, 'push');
const mockRefreshTimeRange = jest.fn();
const MockUrlParamsProvider: React.FC<{
  params?: IUrlParams;
}> = ({ params = {}, children }) => (
  <UrlParamsContext.Provider
    value={{
      urlParams: params,
      refreshTimeRange: mockRefreshTimeRange,
      uiFilters: useUiFilters(params),
    }}
    children={children}
  />
);

function mountDatePicker(params?: IUrlParams) {
  return mount(
    <MockApmPluginContextWrapper>
      <MemoryRouter initialEntries={[history.location]}>
        <LocationProvider>
          <MockUrlParamsProvider params={params}>
            <DatePicker />
          </MockUrlParamsProvider>
        </LocationProvider>
      </MemoryRouter>
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
    jest.clearAllMocks();
  });

  it('should set default query params in the URL', () => {
    mountDatePicker();
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith(
      expect.objectContaining({
        search:
          'rangeFrom=now-15m&rangeTo=now&refreshPaused=false&refreshInterval=10000',
      })
    );
  });

  it('should add missing default value', () => {
    mountDatePicker({
      rangeTo: 'now',
      refreshInterval: 5000,
    });
    expect(mockHistoryPush).toHaveBeenCalledTimes(1);
    expect(mockHistoryPush).toHaveBeenCalledWith(
      expect.objectContaining({
        search:
          'rangeFrom=now-15m&rangeTo=now&refreshInterval=5000&refreshPaused=false',
      })
    );
  });

  it('should not set default query params in the URL when values already defined', () => {
    mountDatePicker({
      rangeFrom: 'now-1d',
      rangeTo: 'now',
      refreshPaused: false,
      refreshInterval: 5000,
    });
    expect(mockHistoryPush).toHaveBeenCalledTimes(0);
  });

  it('should update the URL when the date range changes', () => {
    const datePicker = mountDatePicker();
    datePicker.find(EuiSuperDatePicker).props().onTimeChange({
      start: 'updated-start',
      end: 'updated-end',
      isInvalid: false,
      isQuickSelection: true,
    });
    expect(mockHistoryPush).toHaveBeenCalledTimes(2);
    expect(mockHistoryPush).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search:
          'rangeFrom=updated-start&rangeTo=updated-end&refreshInterval=5000&refreshPaused=false',
      })
    );
  });

  it('should auto-refresh when refreshPaused is false', async () => {
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

  it('should NOT auto-refresh when refreshPaused is true', async () => {
    jest.useFakeTimers();
    mountDatePicker({ refreshPaused: true, refreshInterval: 1000 });
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await wait();
    expect(mockRefreshTimeRange).not.toHaveBeenCalled();
  });
});
