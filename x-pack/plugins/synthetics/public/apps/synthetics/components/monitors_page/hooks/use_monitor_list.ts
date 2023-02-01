/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDebounce } from 'react-use';
import {
  fetchMonitorListAction,
  quietFetchMonitorListAction,
  fetchOverviewStatusAction,
  MonitorListPageState,
  selectEncryptedSyntheticsSavedMonitors,
  selectMonitorListState,
  selectOverviewStatus,
  updateManagementPageStateAction,
} from '../../../state';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useMonitorFiltersState } from '../common/monitor_filters/use_filters';

export function useMonitorList() {
  const dispatch = useDispatch();
  const isDataQueriedRef = useRef(false);

  const { pageState, loading, loaded, error, data } = useSelector(selectMonitorListState);
  const syntheticsMonitors = useSelector(selectEncryptedSyntheticsSavedMonitors);
  const { status: overviewStatus } = useSelector(selectOverviewStatus);

  const { handleFilterChange } = useMonitorFiltersState();
  const { refreshInterval } = useSyntheticsRefreshContext();

  const loadPage = useCallback(
    (state: MonitorListPageState) => {
      dispatch(updateManagementPageStateAction(state));
    },
    [dispatch]
  );
  const reloadPage = useCallback(() => loadPage(pageState), [pageState, loadPage]);

  const reloadPageQuiet = useCallback(() => {
    dispatch(quietFetchMonitorListAction(pageState));
  }, [dispatch, pageState]);

  // Periodically refresh
  useEffect(() => {
    const intervalId = setInterval(() => {
      reloadPageQuiet();
    }, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [reloadPageQuiet, refreshInterval]);

  useDebounce(
    () => {
      const overviewStatusArgs = { ...pageState, perPage: pageState.pageSize };

      dispatch(fetchOverviewStatusAction.get(overviewStatusArgs));
      dispatch(fetchMonitorListAction.get(pageState));
    },
    500,
    [pageState]
  );

  return {
    loading,
    loaded,
    error,
    pageState,
    syntheticsMonitors,
    total: data?.total ?? 0,
    loadPage,
    reloadPage,
    isDataQueried: isDataQueriedRef.current,
    absoluteTotal: data.absoluteTotal ?? 0,
    overviewStatus,
    handleFilterChange,
  };
}
