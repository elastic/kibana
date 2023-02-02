/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import useThrottle from 'react-use/lib/useThrottle';
import useIntersection from 'react-use/lib/useIntersection';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { MonitorOverviewItem } from '../../../../../../../common/runtime_types';
import {
  quietFetchOverviewAction,
  selectOverviewState,
  setFlyoutConfig,
} from '../../../../state/overview';
import { useMonitorsSortedByStatus } from '../../../../hooks/use_monitors_sorted_by_status';
import { useGetUrlParams } from '../../../../hooks/use_url_params';
import { OverviewLoader } from './overview_loader';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { OverviewGridItem } from './overview_grid_item';
import { SortFields } from './sort_fields';
import { NoMonitorsFound } from '../../common/no_monitors_found';
import { MonitorDetailFlyout } from './monitor_detail_flyout';

export const OverviewGrid = memo(() => {
  const { statusFilter } = useGetUrlParams();
  const {
    data: { monitors },
    status,
    flyoutConfig,
    loaded,
    pageState,
  } = useSelector(selectOverviewState);
  const { perPage, sortField } = pageState;
  const [loadNextPage, setLoadNextPage] = useState(false);
  const [page, setPage] = useState(1);

  const { monitorsSortedByStatus } = useMonitorsSortedByStatus();
  const currentMonitors = getCurrentMonitors({
    monitors,
    monitorsSortedByStatus,
    perPage,
    page,
    sortField,
    statusFilter,
  });

  const dispatch = useDispatch();

  const setFlyoutConfigCallback = useCallback(
    ({
      configId,
      id,
      location,
      locationId,
    }: {
      configId: string;
      id: string;
      location: string;
      locationId: string;
    }) => dispatch(setFlyoutConfig({ configId, id, location, locationId })),
    [dispatch]
  );
  const hideFlyout = useCallback(() => dispatch(setFlyoutConfig(null)), [dispatch]);
  const forceRefreshCallback = useCallback(
    () => dispatch(quietFetchOverviewAction.get(pageState)),
    [dispatch, pageState]
  );
  const intersectionRef = useRef(null);
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

  // Display no monitors found when down, up, or disabled filter produces no results
  if (status && !monitorsSortedByStatus.length) {
    return <NoMonitorsFound />;
  }

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline" responsive={false}>
        <EuiFlexItem grow={false}>
          <OverviewPaginationInfo
            page={page}
            loading={!loaded}
            total={status ? monitorsSortedByStatus.length : undefined}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SortFields onSortChange={() => setPage(1)} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {loaded && currentMonitors.length ? (
        <EuiFlexGrid
          columns={4}
          gutterSize="m"
          data-test-subj="syntheticsOverviewGridItemContainer"
        >
          {currentMonitors.map((monitor) => (
            <EuiFlexItem
              key={`${monitor.id}-${monitor.location?.id}`}
              data-test-subj="syntheticsOverviewGridItem"
            >
              <OverviewGridItem monitor={monitor} onClick={setFlyoutConfigCallback} />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      ) : (
        <OverviewLoader />
      )}
      <div ref={intersectionRef}>
        <EuiSpacer size="l" />
      </div>
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
      {flyoutConfig?.configId && flyoutConfig?.location && (
        <MonitorDetailFlyout
          configId={flyoutConfig.configId}
          id={flyoutConfig.id}
          location={flyoutConfig.location}
          locationId={flyoutConfig.locationId}
          onClose={hideFlyout}
          onEnabledChange={forceRefreshCallback}
          onLocationChange={setFlyoutConfigCallback}
        />
      )}
    </>
  );
});

const getCurrentMonitors = ({
  sortField,
  perPage,
  page,
  monitors,
  monitorsSortedByStatus,
  statusFilter,
}: {
  sortField: string;
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

const SHOWING_ALL_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.overview.grid.showingAllMonitors.label',
  {
    defaultMessage: 'Showing all monitors',
  }
);

const SCROLL_TO_TOP_LABEL = i18n.translate('xpack.synthetics.overview.grid.scrollToTop.label', {
  defaultMessage: 'Back to top',
});
