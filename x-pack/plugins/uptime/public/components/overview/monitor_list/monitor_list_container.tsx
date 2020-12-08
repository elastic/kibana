/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import rison, { RisonValue } from 'rison-node';

import { getMonitorList } from '../../../state/actions';
import { monitorListSelector, snapshotDataSelector } from '../../../state/selectors';
import { MonitorListComponent } from './monitor_list';
import { useUrlParams } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';

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
  const { filters } = props;

  const [pageSize, setPageSize] = useState<number>(getPageSizeValue);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [sortField, setSortField] = useState<string>('summary.down');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const dispatch = useDispatch();

  const [getUrlParams, updateUrlParams] = useUrlParams();
  const { dateRangeStart, dateRangeEnd, pagination, statusFilter } = getUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  const monitorList = useSelector(monitorListSelector);

  const { count } = useSelector(snapshotDataSelector);

  useEffect(() => {
    dispatch(
      getMonitorList({
        dateRangeStart,
        dateRangeEnd,
        filters,
        pageSize,
        statusFilter,
        sortField,
        sortDirection,
        pageIndex,
        pagination,
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
    sortField,
    sortDirection,
    pageIndex,
  ]);

  useEffect(() => {
    updateUrlParams({
      pagination: JSON.stringify({
        size: pageSize,
        index: pageIndex,
        sk: { current: monitorList.list.skipped ?? 0, total: monitorList.list.skipped ?? 0 },
      }),
    });
  }, [pageSize, pageIndex, monitorList.list.skipped, updateUrlParams]);

  return (
    <MonitorListComponent
      {...props}
      {...{
        monitorList,
        pageSize,
        setPageSize,
        pageIndex,
        setPageIndex,
        sortField,
        setSortField,
        sortDirection,
        setSortDirection,
        total: !statusFilter ? count?.total ?? 0 : statusFilter === 'up' ? count.up : count.down,
      }}
    />
  );
};
