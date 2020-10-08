/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getMonitorList } from '../../../state/actions';
import { monitorListSelector } from '../../../state/selectors';
import { MonitorListComponent } from './monitor_list';
import { useUrlParams } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';

export interface MonitorListProps {
  filters?: string;
  linkParameters?: string;
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
  const { filters } = props;

  const [pageSize, setPageSize] = useState<number>(getPageSizeValue);

  const dispatch = useDispatch();

  const [getUrlValues] = useUrlParams();
  const { dateRangeStart, dateRangeEnd, pagination, statusFilter } = getUrlValues();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const monitorList = useSelector(monitorListSelector);

  useEffect(() => {
    dispatch(
      getMonitorList({
        dateRangeStart,
        dateRangeEnd,
        filters,
        pageSize,
        pagination,
        statusFilter,
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
  ]);

  return (
    <MonitorListComponent
      {...props}
      monitorList={monitorList}
      pageSize={pageSize}
      setPageSize={setPageSize}
    />
  );
};
