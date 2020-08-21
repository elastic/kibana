/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getMonitorList } from '../../../state/actions';
import { useGetUrlParams } from '../../../hooks';
import { UptimeRefreshContext } from '../../../contexts';

const DEFAULT_PAGE_SIZE = 10;
const LOCAL_STORAGE_KEY = 'xpack.uptime.monitorList.pageSize';
export const getPageSizeValue = () => {
  const value = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '', 10);
  if (isNaN(value)) {
    return DEFAULT_PAGE_SIZE;
  }
  return value;
};

interface Props {
  pageSize: number;
  esKueryFilters?: string;
}

export const useMonitorList = ({ pageSize, esKueryFilters }: Props) => {
  const dispatch = useDispatch();

  const { dateRangeStart, dateRangeEnd, pagination, statusFilter } = useGetUrlParams();

  const { lastRefresh } = useContext(UptimeRefreshContext);

  useEffect(() => {
    dispatch(
      getMonitorList({
        dateRangeStart,
        dateRangeEnd,
        pageSize,
        pagination,
        statusFilter,
        filters: esKueryFilters,
      })
    );
  }, [
    dispatch,
    dateRangeStart,
    dateRangeEnd,
    esKueryFilters,
    lastRefresh,
    pageSize,
    pagination,
    statusFilter,
  ]);
};
