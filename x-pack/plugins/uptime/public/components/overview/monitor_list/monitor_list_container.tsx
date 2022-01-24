/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearRefreshedMonitorId, getMonitorList } from '../../../state/actions';
import { esKuerySelector, monitorListSelector } from '../../../state/selectors';
import { MonitorListComponent } from './monitor_list';
import { useUrlParams } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';
import { getConnectorsAction, getMonitorAlertsAction } from '../../../state/alerts/alerts';
import { useMappingCheck } from '../../../hooks/use_mapping_check';
import { useOverviewFilterCheck } from '../../../hooks/use_overview_filter_check';
import { refreshedMonitorSelector } from '../../../state/reducers/monitor_list';

export interface MonitorListProps {
  filters?: string;
}

const DEFAULT_PAGE_SIZE = 10;
const LOCAL_STORAGE_KEY = 'xpack.uptime.monitorList.pageSize';
const getPageSizeValue = () => {
  const value = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '', 10);
  if (isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  return value;
};

export const MonitorList: React.FC<MonitorListProps> = (props) => {
  const filters = useSelector(esKuerySelector);
  const filterCheck = useOverviewFilterCheck();

  const [pageSize, setPageSize] = useState<number>(getPageSizeValue);

  const dispatch = useDispatch();

  const [getUrlValues] = useUrlParams();
  const { dateRangeStart, dateRangeEnd, pagination, statusFilter, query } = getUrlValues();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const refreshedMonitorIds = useSelector(refreshedMonitorSelector);

  const monitorList = useSelector(monitorListSelector);
  useMappingCheck(monitorList.error);

  useEffect(() => {
    filterCheck(() =>
      dispatch(
        getMonitorList({
          dateRangeStart,
          dateRangeEnd,
          filters,
          pageSize,
          pagination,
          statusFilter,
          query,
        })
      )
    );
  }, [
    dispatch,
    dateRangeStart,
    dateRangeEnd,
    filters,
    filterCheck,
    lastRefresh,
    pageSize,
    pagination,
    statusFilter,
    query,
  ]);

  useEffect(() => {
    dispatch(getMonitorAlertsAction.get());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getConnectorsAction.get());
  }, [dispatch]);

  useEffect(() => {
    if (refreshedMonitorIds) {
      refreshedMonitorIds.forEach((id) => {
        setTimeout(() => {
          dispatch(clearRefreshedMonitorId(id));
        }, 5 * 1000);
      });
    }
  }, [dispatch, refreshedMonitorIds]);

  return (
    <MonitorListComponent
      {...props}
      monitorList={monitorList}
      pageSize={pageSize}
      setPageSize={setPageSize}
      refreshedMonitorIds={refreshedMonitorIds}
    />
  );
};
