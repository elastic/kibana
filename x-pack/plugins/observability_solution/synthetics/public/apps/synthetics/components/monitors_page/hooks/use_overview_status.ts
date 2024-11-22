/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
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

  const { status, error, loaded, loading, allConfigs } = useSelector(selectOverviewStatus);

  const { lastRefresh } = useSyntheticsRefreshContext();

  const dispatch = useDispatch();

  useEffect(() => {
    if (loaded) {
      dispatch(quietFetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
    } else {
      dispatch(fetchOverviewStatusAction.get({ pageState, scopeStatusByLocation }));
    }
    // loaded is omitted from the dependency array because it is not used in the callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, lastRefresh, pageState, scopeStatusByLocation]);

  return {
    status,
    error,
    loading,
    loaded,
    allConfigs: allConfigs ?? [],
  };
}
