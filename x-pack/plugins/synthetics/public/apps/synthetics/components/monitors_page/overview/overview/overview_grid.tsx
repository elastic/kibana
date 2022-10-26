/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useRef, memo } from 'react';
import { i18n } from '@kbn/i18n';
import useThrottle from 'react-use/lib/useThrottle';
import { useSelector } from 'react-redux';
import useIntersection from 'react-use/lib/useIntersection';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { selectOverviewState } from '../../../../state/overview';
import { MonitorOverviewItem } from '../../../../../../../common/runtime_types';
import { useMonitorsSortedByStatus } from '../../../../hooks/use_monitors_sorted_by_status';
import { OverviewLoader } from './overview_loader';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { OverviewGridItem } from './overview_grid_item';
import { SortFields } from './sort_fields';

export const OverviewGrid = memo(() => {
  const {
    data: { monitors },
    loaded,
    pageState,
  } = useSelector(selectOverviewState);
  const { perPage, sortField } = pageState;
  const [loadNextPage, setLoadNextPage] = useState(false);
  const [page, setPage] = useState(1);

  const { monitorsSortedByStatus } = useMonitorsSortedByStatus(
    sortField === 'status' && monitors.length !== 0
  );
  const currentMonitors = getCurrentMonitors({
    monitors,
    monitorsSortedByStatus,
    perPage,
    page,
    sortField,
  });

  const intersectionRef = useRef(null);
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px 640px', // Height of 4 rows of monitors, minus the gutters
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

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <OverviewPaginationInfo page={page} loading={!loaded} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SortFields onSortChange={() => setPage(1)} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      {loaded && currentMonitors.length ? (
        <EuiFlexGrid columns={4} data-test-subj="syntheticsOverviewGridItemContainer">
          {currentMonitors.map((monitor) => (
            <EuiFlexItem
              key={`${monitor.id}-${monitor.location?.id}`}
              data-test-subj="syntheticsOverviewGridItem"
            >
              <OverviewGridItem monitor={monitor} />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      ) : (
        <OverviewLoader />
      )}
      <span ref={intersectionRef}>
        <EuiSpacer size="l" />
      </span>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        {currentMonitors.length === monitors.length && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{SHOWING_ALL_MONITORS_LABEL}</EuiText>
          </EuiFlexItem>
        )}
        {currentMonitors.length === monitors.length && currentMonitors.length > perPage && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={() => window.scrollTo(0, 0)}
              iconType="sortUp"
              iconSide="right"
              size="xs"
            >
              {SCROLL_TO_TOP_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );
});

const getCurrentMonitors = ({
  sortField,
  perPage,
  page,
  monitors,
  monitorsSortedByStatus,
}: {
  sortField: string;
  perPage: number;
  page: number;
  monitors: MonitorOverviewItem[];
  monitorsSortedByStatus: MonitorOverviewItem[];
}) => {
  if (sortField === 'status') {
    return monitorsSortedByStatus.slice(0, perPage * page);
  } else {
    return monitors.slice(0, perPage * page);
  }
};

const SHOWING_ALL_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.overview.grid.showingAllMonitors.label',
  {
    defaultMessage: 'Showing all monitors',
  }
);

const SCROLL_TO_TOP_LABEL = i18n.translate('xpack.synthetics.overview.grid.scrollToTop.label', {
  defaultMessage: 'Back to top',
});
