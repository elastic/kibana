/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { parse } from 'query-string';
import { dateRangeSelector, uiSelector } from '../state/selectors';
import { setDateRange, setUiState } from '../state/actions';
import { getSupportedUrlParams, UptimeUrlParams } from '../lib/helper';
import { useUrlParams } from './use_url_params';
import { UiState } from '../state/reducers/ui';
import { OverviewFiltersState } from '../state/reducers/overview_filters';

const resolveUrlUpdates = (
  params: UptimeUrlParams,
  storeState: UiState
): Partial<UptimeUrlParams> => {
  const urlState: Partial<UptimeUrlParams> = {};
  if (
    params.dateRangeStart !== storeState.dateRange.from ||
    params.dateRangeEnd !== storeState.dateRange.to
  ) {
    urlState.dateRangeStart = storeState.dateRange.from;
    urlState.dateRangeEnd = storeState.dateRange.to;
  }

  if (params.autorefreshInterval !== storeState.autorefreshInterval) {
    urlState.autorefreshInterval = storeState.autorefreshInterval;
  }

  if (params.autorefreshIsPaused !== storeState.autorefreshIsPaused) {
    urlState.autorefreshIsPaused = storeState.autorefreshIsPaused;
  }

  if (params.search !== storeState.searchText) {
    urlState.search = storeState.searchText;
  }

  if (params.statusFilter !== storeState.statusFilter) {
    urlState.statusFilter = storeState.statusFilter;
  }

  if (params.pagination !== storeState.currentMonitorListPage) {
    urlState.pagination = storeState.currentMonitorListPage;
  }

  return urlState;
};

const resolveStateChanges = (params: UptimeUrlParams, storeState: UiState): Partial<UiState> => {
  const uiState: Partial<UiState> = {};
  if (
    params.dateRangeStart !== storeState.dateRange.from ||
    params.dateRangeEnd !== storeState.dateRange.to
  ) {
    uiState.dateRange = { from: params.dateRangeStart, to: params.dateRangeEnd };
  }

  if (params.autorefreshInterval !== storeState.autorefreshInterval) {
    uiState.autorefreshInterval = params.autorefreshInterval;
  }

  if (params.autorefreshIsPaused !== storeState.autorefreshIsPaused) {
    uiState.autorefreshIsPaused = params.autorefreshIsPaused;
  }

  if (params.search !== storeState.searchText) {
    uiState.searchText = params.search;
  }

  if (params.statusFilter !== storeState.statusFilter) {
    uiState.statusFilter = params.statusFilter;
  }

  if (params.pagination !== storeState.currentMonitorListPage) {
    uiState.currentMonitorListPage = params.pagination;
  }

  return uiState;
};

/**
 * TODO: it is probably best to move this hook to the router component,
 * and not export it from the module, because we probably only ever want it to be
 * called in one place.
 */
export const useSynchronizedState = () => {
  const [get, set] = useUrlParams();
  const params = get();
  // console.log('params', params);
  const history = useHistory();
  const storeState = useSelector(uiSelector);
  const { autorefreshInterval, autorefreshIsPaused, dateRange } = storeState;
  const dispatch = useDispatch();
  useEffect(() => {
    const uiStateDelta = resolveStateChanges(params, storeState);
    if (Object.keys(uiStateDelta).length > 0) {
      dispatch(setUiState(uiStateDelta));
    }
    /*
     * We only want this effect to fire on initial render, so we can
     * override default store values with initial URL params. Subsequent
     * updates are performed in the history listener below.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    history.listen((newHistory) => {
      const supportedParams = getSupportedUrlParams(parse(newHistory.search));
      const uiStateDelta = resolveStateChanges(supportedParams, storeState);
      if (Object.keys(uiStateDelta).length > 0) {
        dispatch(setUiState(uiStateDelta));
      }
      // if (
      //   dateRange.from !== supportedParams.dateRangeStart ||
      //   dateRange.to !== supportedParams.dateRangeEnd
      // ) {
      //   dispatch(
      //     setDateRange({ from: supportedParams.dateRangeStart, to: supportedParams.dateRangeEnd })
      //   );
      // }
    });
  }, [dispatch, storeState, history]);

  useEffect(() => {
    const urlStateDelta = resolveUrlUpdates(params, storeState);
    if (Object.keys(urlStateDelta).length > 0) {
      set(urlStateDelta);
    }
  }, [params, storeState, set]);

  // useEffect(() => {
  //   if (params.dateRangeStart !== dateRange.from || params.dateRangeEnd !== dateRange.to) {
  //     set({
  //       dateRangeStart: dateRange.from,
  //       dateRangeEnd: dateRange.to,
  //     });
  //   }
  // }, [dateRange, params, set]);

  // useEffect(() => {
  //   if (params.autorefreshInterval !== autorefreshInterval) {
  //     set({
  //       autorefreshInterval,
  //     });
  //   }
  // });
};
