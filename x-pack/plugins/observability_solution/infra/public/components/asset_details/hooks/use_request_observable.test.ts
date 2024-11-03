/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useRequestObservable } from './use_request_observable';
import { type RequestState, useLoadingStateContext } from './use_loading_state';
import { useDatePickerContext, type UseDateRangeProviderProps } from './use_date_picker';
import { useSearchSessionContext } from '../../../hooks/use_search_session';
import { BehaviorSubject } from 'rxjs';

jest.mock('./use_loading_state');
jest.mock('./use_date_picker');
jest.mock('../../../hooks/use_search_session');

const useLoadingStateContextMock = useLoadingStateContext as jest.MockedFunction<
  typeof useLoadingStateContext
>;
const useDatePickerContextMock = useDatePickerContext as jest.MockedFunction<
  typeof useDatePickerContext
>;

const useSearchSessionMock = useSearchSessionContext as jest.MockedFunction<
  typeof useSearchSessionContext
>;

describe('useRequestObservable', () => {
  const isAutoRefreshRequestPendingMock$ = new BehaviorSubject<boolean>(false);

  const autoRefreshConfig$ = new BehaviorSubject<
    UseDateRangeProviderProps['autoRefresh'] | undefined
  >({ interval: 5000, isPaused: false });

  const requestStateMock$ = new BehaviorSubject<RequestState | null>(null);
  // needed to spy on `next` function
  requestStateMock$.next = jest.fn();

  const mockUseSearchSessionMock = () => {
    useSearchSessionMock.mockReturnValue({
      updateSearchSessionId: jest.fn(() => {}),
      searchSessionId: '',
    });
  };

  const mockUseLoadingStateContextMock = () => {
    useLoadingStateContextMock.mockReturnValue({
      requestState$: requestStateMock$,
      isAutoRefreshRequestPending$: isAutoRefreshRequestPendingMock$,
    });
  };

  const mockDatePickerContext = () => {
    useDatePickerContextMock.mockReturnValue({
      autoRefreshConfig$,
    } as unknown as ReturnType<typeof useDatePickerContext>);
  };

  beforeEach(() => {
    mockDatePickerContext();
    mockUseSearchSessionMock();
    mockUseLoadingStateContextMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process a valid request function', async () => {
    const { result, waitFor, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      result.current.request$.next(() => Promise.resolve());

      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toHaveBeenCalledWith('done');

    unmount();
  });

  it('should be able to make new requests if isAutoRefreshRequestPending is false', async () => {
    const { result, waitFor, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      isAutoRefreshRequestPendingMock$.next(false);
      // simulating requests
      result.current.request$.next(() => Promise.resolve());
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toBeCalledTimes(2);
    expect(requestStateMock$.next).toHaveBeenCalledWith('done');

    unmount();
  });

  it('should block new requests when isAutoRefreshRequestPending is true', async () => {
    const { result, waitFor, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      isAutoRefreshRequestPendingMock$.next(false);
      // simulating requests
      result.current.request$.next(() => Promise.resolve());

      isAutoRefreshRequestPendingMock$.next(true);
      // simulating requests
      result.current.request$.next(() => Promise.resolve());
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toBeCalledTimes(2);
    expect(requestStateMock$.next).toHaveBeenCalledWith('done');

    unmount();
  });

  it('should not block new requests when auto-refresh is paused', async () => {
    const { result, waitFor, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      autoRefreshConfig$.next({ isPaused: true, interval: 5000 });

      // simulating requests
      result.current.request$.next(() => Promise.resolve());
      result.current.request$.next(() => Promise.resolve());
      result.current.request$.next(() => Promise.resolve());
      result.current.request$.next(() => Promise.resolve());
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toBeCalledTimes(8);
    expect(requestStateMock$.next).toHaveBeenCalledWith('done');

    unmount();
  });

  it('should complete the request when an error is thrown', async () => {
    const { result, waitFor, unmount } = renderHook(() => useRequestObservable());

    act(() => {
      autoRefreshConfig$.next({ isPaused: true, interval: 5000 });
      // simulating requests
      result.current.request$.next(() => Promise.reject());
    });

    await waitFor(() => expect(requestStateMock$.next).toHaveBeenCalledWith('running'));

    expect(requestStateMock$.next).toBeCalledTimes(2);
    expect(requestStateMock$.next).toHaveBeenCalledWith('error');

    unmount();
  });
});
