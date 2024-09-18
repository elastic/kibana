/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useThrottle from 'react-use/lib/useThrottle';
import { useEffect, useState, MutableRefObject } from 'react';
import useIntersection from 'react-use/lib/useIntersection';
import { useSelector } from 'react-redux';
import type { MonitorListSortField } from '../../../../../../../common/runtime_types/monitor_management/sort_field';
import { useGetUrlParams } from '../../../../hooks';
import { selectOverviewState } from '../../../../state';
import { MonitorOverviewItem } from '../../../../../../../common/runtime_types';

export const useInfiniteScroll = ({
  intersectionRef,
  monitorsSortedByStatus,
}: {
  intersectionRef: MutableRefObject<HTMLElement | null>;
  monitorsSortedByStatus: any;
}) => {
  const [page, setPage] = useState(1);
  const [loadNextPage, setLoadNextPage] = useState(false);

  const { statusFilter } = useGetUrlParams();
  const {
    pageState: { perPage, sortField },
    data: { monitors },
  } = useSelector(selectOverviewState);

  const currentMonitors = getCurrentMonitors({
    monitors,
    monitorsSortedByStatus,
    perPage,
    page,
    sortField,
    statusFilter,
  });

  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '640px', // Height of 4 rows of monitors, minus the gutters
    threshold: 0.1,
  });
  const hasIntersected = intersection && intersection.intersectionRatio > 0;

  useThrottle(() => {
    if (
      hasIntersected &&
      currentMonitors.length === page * perPage &&
      currentMonitors.length !== monitors.length
    ) {
      setLoadNextPage(true);
    } else {
      setLoadNextPage(false);
    }
  }, 1000);

  useEffect(() => {
    if (loadNextPage) {
      setPage((p) => p + 1);
      setLoadNextPage(false);
    }
  }, [loadNextPage]);

  return { currentMonitors };
};

const getCurrentMonitors = ({
  sortField,
  perPage,
  page,
  monitors,
  monitorsSortedByStatus,
  statusFilter,
}: {
  sortField: MonitorListSortField;
  perPage: number;
  page: number;
  monitors: MonitorOverviewItem[];
  monitorsSortedByStatus: MonitorOverviewItem[];
  statusFilter?: string;
}) => {
  if (sortField === 'status' || statusFilter) {
    return monitorsSortedByStatus.slice(0, perPage * page);
  } else {
    return monitors.slice(0, perPage * page);
  }
};
