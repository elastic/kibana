/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import useIntersection from 'react-use/lib/useIntersection';
import { EuiFlexGroup, EuiFlexItem, EuiFlexGrid, EuiSpacer } from '@elastic/eui';
import { selectOverviewState } from '../../../../state/overview';
import { MonitorOverviewItem } from '../../../../../../../common/runtime_types';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { OverviewGridItem } from './overview_grid_item';
import { SortFields } from './sort_fields';
import { useMonitorsSortedByStatus } from '../../../../hooks/use_monitors_sorted_by_status';

export const OverviewGrid = () => {
  const {
    data: { monitors },
    loaded,
    pageState: { perPage, sortField, sortOrder },
  } = useSelector(selectOverviewState);
  const { monitorsSortedByStatus } = useMonitorsSortedByStatus(sortField === 'status');
  const [page, setPage] = useState(1);
  const currentMonitors = getCurrentMonitors({
    monitors,
    monitorsSortedByStatus,
    perPage,
    sortField,
    sortOrder,
  });
  const intersectionRef = useRef(null);
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 1,
  });
  const hasIntersected = intersection && intersection.intersectionRatio === 1;
  useEffect(() => {
    if (hasIntersected) {
      setPage((p) => p + 1);
    }
  }, [hasIntersected]);

  return loaded ? (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <OverviewPaginationInfo page={page} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SortFields />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGrid columns={4}>
        {currentMonitors.map((monitor) => (
          <EuiFlexItem
            key={`${monitor.id}-${monitor.location?.id}`}
            data-test-subj="syntheticsOverviewGridItem"
          >
            <OverviewGridItem monitor={monitor} />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
      <span ref={intersectionRef} />
    </>
  ) : null;
};

const getCurrentMonitors = ({
  sortField,
  sortOrder,
  perPage,
  monitors,
  monitorsSortedByStatus,
}: {
  sortField: string;
  sortOrder: string;
  perPage: number;
  monitors: MonitorOverviewItem[];
  monitorsSortedByStatus: MonitorOverviewItem[];
}) => {
  if (sortField === 'status') {
    return monitorsSortedByStatus.slice(0, perPage);
  } else {
    return monitors.slice(0, perPage);
  }
};
