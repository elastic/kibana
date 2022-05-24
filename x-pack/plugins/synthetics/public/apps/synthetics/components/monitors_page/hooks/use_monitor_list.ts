/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import {
  fetchMonitorListAction,
  MonitorListPageState,
  selectEncryptedSyntheticsSavedMonitors,
  selectMonitorListState,
} from '../../../state';

export function useMonitorList() {
  const dispatch = useDispatch();

  const { pageState, loading, error } = useSelector(selectMonitorListState);
  const syntheticsMonitors = useSelector(selectEncryptedSyntheticsSavedMonitors);

  const { type: viewType } = useParams<{ type: 'all' | 'invalid' }>();

  const loadPage = useCallback(
    (state: MonitorListPageState) => dispatch(fetchMonitorListAction.get(state)),
    [dispatch]
  );

  const reloadPage = useCallback(() => loadPage(pageState), [pageState, loadPage]);

  // Initial loading
  useEffect(() => {
    if (!loading) {
      reloadPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadPage]);

  return {
    loading,
    error,
    pageState,
    syntheticsMonitors,
    viewType,
    loadPage,
    reloadPage,
  };
}
