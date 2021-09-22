/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDispatch, useSelector } from 'react-redux';
import { useCallback, useContext, useEffect } from 'react';
import { selectPingList } from '../../../state/selectors';
import { GetPingsParams, Ping } from '../../../../common/runtime_types/ping';
import { getPings as getPingsAction } from '../../../state/actions';
import { useGetUrlParams, useMonitorId } from '../../../hooks';
import { UptimeRefreshContext, UptimeSettingsContext } from '../../../contexts';
import { useFetcher } from '../../../../../observability/public';
import { fetchJourneysFailedSteps } from '../../../state/api/journey';
import { useSelectedFilters } from '../../../hooks/use_selected_filters';
import { MONITOR_TYPES } from '../../../../common/constants';

interface Props {
  pageSize: number;
  pageIndex: number;
}

export const usePingsList = ({ pageSize, pageIndex }: Props) => {
  const {
    error,
    loading,
    pingList: { pings, total },
  } = useSelector(selectPingList);

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const { dateRangeStart: from, dateRangeEnd: to } = useContext(UptimeSettingsContext);

  const { statusFilter } = useGetUrlParams();

  const selectedFilters = useSelectedFilters();

  const dispatch = useDispatch();

  const monitorId = useMonitorId();

  const getPings = useCallback(
    (params: GetPingsParams) => dispatch(getPingsAction(params)),
    [dispatch]
  );

  const locations = JSON.stringify(selectedFilters.selectedLocations);
  const excludedLocations = JSON.stringify(selectedFilters.excludedLocations);

  useEffect(() => {
    getPings({
      monitorId,
      dateRange: {
        from,
        to,
      },
      excludedLocations,
      locations,
      index: pageIndex,
      size: pageSize,
      status: statusFilter !== 'all' ? statusFilter : '',
    });
  }, [
    from,
    to,
    getPings,
    monitorId,
    lastRefresh,
    pageIndex,
    pageSize,
    statusFilter,
    locations,
    excludedLocations,
  ]);

  const { data } = useFetcher(() => {
    if (pings?.length > 0 && pings.find((ping) => ping.monitor.type === MONITOR_TYPES.BROWSER))
      return fetchJourneysFailedSteps({
        checkGroups: pings.map((ping: Ping) => ping.monitor.check_group!),
      });
  }, [pings]);

  return { error, loading, pings, total, failedSteps: data };
};
