/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMonitorList } from '../../../state/actions';
import { esKuerySelector, monitorListSelector } from '../../../state/selectors';
import { MonitorListComponent } from './monitor_list';
import { useUrlParams } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';
import { getConnectorsAction, getMonitorAlertsAction } from '../../../state/alerts/alerts';
import { useMappingCheck } from '../../../hooks/use_mapping_check';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { uptimeMonitorType } from './actions/add_monitor_modal';
import { useFetcher } from '../../../../../observability/public';

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
  const {
    services: { savedObjects },
  } = useKibana();

  const filters = useSelector(esKuerySelector);

  const [pageSize, setPageSize] = useState<number>(getPageSizeValue);

  const dispatch = useDispatch();

  const [getUrlValues] = useUrlParams();
  const { dateRangeStart, dateRangeEnd, pagination, statusFilter, query } = getUrlValues();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const monitorList = useSelector(monitorListSelector);
  useMappingCheck(monitorList.error);

  const { data: monitorObjects } = useFetcher(async () => {
    return savedObjects?.client.find({ type: uptimeMonitorType });
  }, [lastRefresh]);

  const objMonitors = monitorObjects?.savedObjects
    .map(({ attributes, id }) => ({
      ...(attributes as object),
      id,
    }))
    .filter(({ id }) => {
      if (monitorList.list.summaries.length > 0) {
        return !monitorList.list.summaries.find((item) => item.monitor_id.includes(id));
      }
      return true;
    });

  useEffect(() => {
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
    );
  }, [
    dispatch,
    dateRangeStart,
    dateRangeEnd,
    filters,
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

  return (
    <MonitorListComponent
      {...props}
      monitorList={monitorList}
      pageSize={pageSize}
      setPageSize={setPageSize}
      monitorListObjects={objMonitors}
      allMonListObjs={monitorObjects?.savedObjects}
    />
  );
};
