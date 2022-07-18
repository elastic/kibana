/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useGetUrlParams } from '../../../hooks';
import {
  fetchMonitorListAction,
  MonitorListPageState,
  selectEncryptedSyntheticsSavedMonitors,
  selectMonitorListState,
} from '../../../state';

export function useMonitorList() {
  const dispatch = useDispatch();
  const [isDataQueried, setIsDataQueried] = useState(false);

  const { pageState, loading, error, data } = useSelector(selectMonitorListState);
  const syntheticsMonitors = useSelector(selectEncryptedSyntheticsSavedMonitors);

  const { query, tags, monitorType, locations: locationFilters } = useGetUrlParams();

  const { search } = useLocation();

  const loadPage = useCallback(
    (state: MonitorListPageState) =>
      dispatch(
        fetchMonitorListAction.get({
          ...state,
          query,
          tags,
          monitorType,
          locations: locationFilters,
        })
      ),
    [dispatch, locationFilters, monitorType, query, tags]
  );

  const reloadPage = useCallback(() => loadPage(pageState), [pageState, loadPage]);

  useEffect(() => {
    reloadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Initial loading
  useEffect(() => {
    if (!loading && !isDataQueried) {
      reloadPage();
    }

    if (loading) {
      setIsDataQueried(true);
    }
  }, [reloadPage, isDataQueried, syntheticsMonitors, loading]);

  return {
    loading,
    error,
    pageState,
    syntheticsMonitors,
    total: data?.total ?? 0,
    loadPage,
    reloadPage,
    isDataQueried,
    absoluteTotal: data.absoluteTotal ?? 0,
  };
}
