/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
  MonitorOverviewPageState,
  selectOverviewStatus,
} from '../../../state';

export function useOverviewStatus({ pageState }: { pageState: MonitorOverviewPageState }) {
  const { status, statusError } = useSelector(selectOverviewStatus);

  const { lastRefresh } = useSyntheticsRefreshContext();
  const lastRefreshRef = useRef(lastRefresh);

  const dispatch = useDispatch();

  useEffect(() => {
    if (lastRefresh !== lastRefreshRef.current) {
      dispatch(quietFetchOverviewStatusAction.get(pageState));
      lastRefreshRef.current = lastRefresh;
    } else {
      dispatch(fetchOverviewStatusAction.get(pageState));
    }
  }, [dispatch, lastRefresh, pageState]);

  return {
    status,
    statusError,
  };
}
