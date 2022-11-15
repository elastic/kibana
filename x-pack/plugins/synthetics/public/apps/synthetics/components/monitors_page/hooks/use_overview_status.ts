/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import {
  fetchOverviewStatusAction,
  quietFetchOverviewStatusAction,
  MonitorOverviewPageState,
  selectOverviewStatus,
} from '../../../state';

export interface StatusByLocationAndMonitor {
  [locationId: string]: { [configId: string]: 'up' | 'down' };
}

export function useOverviewStatus({ pageState }: { pageState: MonitorOverviewPageState }) {
  const { status, statusError } = useSelector(selectOverviewStatus);
  const statusByLocationAndMonitor = useMemo(() => {
    return [...(status?.upConfigs ?? []), ...(status?.downConfigs ?? [])].reduce(
      (acc, cur, index) => {
        if (!acc[cur.location]) {
          acc[cur.location] = {};
        }
        acc[cur.location][cur.configId] = index <= (status?.upConfigs ?? []).length ? 'up' : 'down';

        return acc;
      },
      {} as StatusByLocationAndMonitor
    );
  }, [status]);

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
    statusByLocationAndMonitor,
  };
}
