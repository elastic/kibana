/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useLoadingState } from './use_loading_state';
import { useDatePickerContext, type UseDateRangeProviderProps } from './use_date_picker';
import { BehaviorSubject, EMPTY, of, Subject, Subscription, skip } from 'rxjs';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { coreMock } from '@kbn/core/public/mocks';
import { SearchSessionState, waitUntilNextSessionCompletes$ } from '@kbn/data-plugin/public';
import { useSearchSessionContext } from '../../../hooks/use_search_session';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

jest.mock('./use_date_picker');
jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_search_session');

jest.mock('@kbn/data-plugin/public', () => ({
  ...jest.requireActual('@kbn/data-plugin/public'),
  waitUntilNextSessionCompletes$: jest.fn(),
}));

const useDatePickerContextMock = useDatePickerContext as jest.MockedFunction<
  typeof useDatePickerContext
>;

const useKibanaContextForPluginMock = useKibanaContextForPlugin as jest.MockedFunction<
  typeof useKibanaContextForPlugin
>;

const waitUntilNextSessionCompletesMock$ = waitUntilNextSessionCompletes$ as jest.MockedFunction<
  typeof waitUntilNextSessionCompletes$
>;

const useSearchSessionContextMock = useSearchSessionContext as jest.MockedFunction<
  typeof useSearchSessionContext
>;

describe('useLoadingState', () => {
  let subscription: Subscription;

  const autoRefreshTick$ = new Subject();
  const autoRefreshConfig$ = new BehaviorSubject<
    UseDateRangeProviderProps['autoRefresh'] | undefined
  >({ interval: 1000, isPaused: false });

  const sessionState$ = new BehaviorSubject<SearchSessionState>(SearchSessionState.None);

  const updateSearchSessionIdMock = jest.fn();

  const mockSearchSessionContext = () => {
    useSearchSessionContextMock.mockReturnValue({
      updateSearchSessionId: updateSearchSessionIdMock,
      searchSessionId: '',
    });
  };

  const mockDatePickerContext = () => {
    useDatePickerContextMock.mockReturnValue({
      autoRefreshConfig$,
      autoRefreshTick$,
    } as unknown as ReturnType<typeof useDatePickerContext>);
  };

  const mockUseKibana = () => {
    const dataPluginStartMock = dataPluginMock.createStartContract();
    useKibanaContextForPluginMock.mockReturnValue({
      services: {
        ...coreMock.createStart(),
        data: {
          ...dataPluginStartMock,
          search: {
            ...dataPluginStartMock.search,
            session: {
              ...dataPluginStartMock.search.session,
              state$: sessionState$,
            },
          },
        },
      },
    } as unknown as ReturnType<typeof useKibanaContextForPlugin>);
  };

  beforeEach(() => {
    subscription = new Subscription();
    jest.useFakeTimers();
    waitUntilNextSessionCompletesMock$.mockReturnValue(of(SearchSessionState.None));
    mockSearchSessionContext();
    mockUseKibana();
    mockDatePickerContext();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    subscription.unsubscribe();
  });

  it('should set isAutoRefreshRequestPending to true when there are requests pending', async () => {
    const { result, unmount, waitFor } = renderHook(() => useLoadingState());

    let receivedValue = false;
    subscription.add(
      result.current.isAutoRefreshRequestPending$.pipe(skip(1)).subscribe((value) => {
        receivedValue = value;
      })
    );

    act(() => {
      autoRefreshTick$.next(null); // auto-refresh ticks
      result.current.requestState$.next('running'); // simulates a new request
      result.current.requestState$.next('done'); // simulates completion of a request
      result.current.requestState$.next('running');
      result.current.requestState$.next('running');
      result.current.requestState$.next('running');
      autoRefreshTick$.next(null); // auto-refresh ticks
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(receivedValue).toBe(true));

    unmount();
  });

  it('should set isAutoRefreshRequestPending to false when all requests complete', async () => {
    const { result, unmount, waitFor } = renderHook(() => useLoadingState());

    let receivedValue = true;
    subscription.add(
      result.current.isAutoRefreshRequestPending$.subscribe((value) => {
        receivedValue = value;
      })
    );

    act(() => {
      autoRefreshTick$.next(null); // auto-refresh ticks
      result.current.requestState$.next('running'); // simulates a new request
      result.current.requestState$.next('done'); // simulates completion of a request
      result.current.requestState$.next('running');
      result.current.requestState$.next('done');
      autoRefreshTick$.next(null); // auto-refresh ticks
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(receivedValue).toBe(false));

    unmount();
  });

  it('should not call updateSearchSessionId if waitUntilNextSessionCompletesMock$ returns empty', async () => {
    const { unmount, waitFor } = renderHook(() => useLoadingState());

    // waitUntilNextSessionCompletes$ returns EMPTY when the status is loading or none
    sessionState$.next(SearchSessionState.Loading);
    waitUntilNextSessionCompletesMock$.mockReturnValue(EMPTY);

    act(() => {
      autoRefreshTick$.next(null);
      jest.runOnlyPendingTimers();
    });

    // only the mount call must  happen
    await waitFor(() => expect(updateSearchSessionIdMock).toHaveBeenCalledTimes(1));

    unmount();
  });

  it('should call updateSearchSessionId when waitUntilNextSessionCompletesMock$ returns', async () => {
    const { unmount, waitFor } = renderHook(() => useLoadingState());

    // waitUntilNextSessionCompletes$ returns something when the status is Completed or BackgroundCompleted
    sessionState$.next(SearchSessionState.Loading);
    waitUntilNextSessionCompletesMock$.mockReturnValue(of(SearchSessionState.Completed));

    act(() => {
      autoRefreshTick$.next(null);
      jest.runOnlyPendingTimers();
    });

    await waitFor(() => expect(updateSearchSessionIdMock).toHaveBeenCalledTimes(2));

    unmount();
  });
});
