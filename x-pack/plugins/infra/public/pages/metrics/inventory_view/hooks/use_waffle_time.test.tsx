/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useWaffleTime, DEFAULT_WAFFLE_TIME_STATE, WaffleTimeState } from './use_waffle_time';

jest.mock('../../../../hooks/use_kibana_timefilter_time', () => ({
  useKibanaTimefilterTime: (defaults: { from: string; to: string }) => [() => defaults],
  useSyncKibanaTimeFilterTime: () => [() => {}],
}));

const renderUseWaffleTimeHook = () => renderHook(() => useWaffleTime());

interface LocalStore {
  [key: string]: string;
}

interface LocalStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const STORE: LocalStore = {};
const localStorageMock: LocalStorage = {
  getItem: (key: string) => {
    return STORE[key] || null;
  },
  setItem: (key: string, value: any) => {
    STORE[key] = value.toString();
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useWaffleTime', () => {
  const today = new Date('2022-01-01 01:00:00').getTime();
  const yesterday = new Date('2021-12-31 01:00:00').getTime();
  beforeEach(() => {
    delete STORE.waffleTime;
    jest.useFakeTimers();
    jest.setSystemTime(today);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should work with current time', () => {
    const { result } = renderUseWaffleTimeHook();
    expect(result.current.currentTime).toEqual(today);
    expect(result.current.isAutoReloading).toEqual(false);
  });

  it('should change the store when time update', () => {
    const { result, rerender } = renderUseWaffleTimeHook();
    const newTime: WaffleTimeState = {
      ...DEFAULT_WAFFLE_TIME_STATE,
      currentTime: yesterday,
      isAutoReloading: true,
    };
    act(() => {
      result.current.setWaffleTimeState(newTime);
    });
    rerender();
    expect(result.current.currentTime).toEqual(newTime.currentTime);
    expect(result.current.isAutoReloading).toEqual(newTime.isAutoReloading);
  });

  it('should load the time from the store when available', () => {
    const newStoreTime: WaffleTimeState = {
      ...DEFAULT_WAFFLE_TIME_STATE,
      currentTime: yesterday,
      isAutoReloading: false,
    };
    STORE.waffleTime = JSON.stringify(newStoreTime);
    const { result } = renderUseWaffleTimeHook();
    expect(result.current.currentTime).toEqual(newStoreTime.currentTime);
    expect(result.current.isAutoReloading).toEqual(newStoreTime.isAutoReloading);
  });
});
