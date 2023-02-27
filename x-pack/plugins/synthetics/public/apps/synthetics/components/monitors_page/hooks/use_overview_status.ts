/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import { selectOverviewPageState } from '../../../state';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
  selectOverviewStatus,
} from '../../../state/overview_status';

export function useOverviewStatus({ scopeStatusByLocation }: { scopeStatusByLocation: boolean }) {
  const pageState = useSelector(selectOverviewPageState);

  const { status, error, loaded } = useSelector(selectOverviewStatus);

  const { lastRefresh } = useSyntheticsRefreshContext();

  const dispatch = useDispatch();
  const reload = useCallback(() => {
    dispatch(fetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
  }, [dispatch, pageState, scopeStatusByLocation]);

  useEffect(() => {
    if (loaded) {
      dispatch(quietFetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
    } else {
      reload();
    }
  }, [dispatch, reload, lastRefresh, pageState, loaded, scopeStatusByLocation]);

  return {
    status,
    error,
    reload,
  };
}
