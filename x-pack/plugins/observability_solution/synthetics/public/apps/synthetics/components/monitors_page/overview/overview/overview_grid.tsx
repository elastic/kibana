/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, memo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiButtonEmpty,
  EuiText,
} from '@elastic/eui';
import { selectOverviewStatus } from '../../../../state/overview_status';
import { useInfiniteScroll } from './use_infinite_scroll';
import { GridItemsByGroup } from './grid_by_group/grid_items_by_group';
import { GroupFields } from './grid_by_group/group_fields';
import {
  quietFetchOverviewAction,
  selectOverviewState,
  setFlyoutConfig,
} from '../../../../state/overview';
import { useMonitorsSortedByStatus } from '../../../../hooks/use_monitors_sorted_by_status';
import { OverviewLoader } from './overview_loader';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { FlyoutParamProps, OverviewGridItem } from './overview_grid_item';
import { SortFields } from './sort_fields';
import { NoMonitorsFound } from '../../common/no_monitors_found';
import { MonitorDetailFlyout } from './monitor_detail_flyout';

export const OverviewGrid = memo(() => {
  const { status } = useSelector(selectOverviewStatus);

  const {
    data: { monitors },
    flyoutConfig,
    loaded,
    pageState,
    groupBy: { field: groupField },
  } = useSelector(selectOverviewState);
  const { perPage } = pageState;
  const [page, setPage] = useState(1);

  const dispatch = useDispatch();
  const intersectionRef = useRef(null);
  const { monitorsSortedByStatus } = useMonitorsSortedByStatus();

  const setFlyoutConfigCallback = useCallback(
    (params: FlyoutParamProps) => dispatch(setFlyoutConfig(params)),
    [dispatch]
  );
  const hideFlyout = useCallback(() => dispatch(setFlyoutConfig(null)), [dispatch]);
  const forceRefreshCallback = useCallback(
    () => dispatch(quietFetchOverviewAction.get(pageState)),
    [dispatch, pageState]
  );

  const { currentMonitors } = useInfiniteScroll({ intersectionRef, monitorsSortedByStatus });

  // Display no monitors found when down, up, or disabled filter produces no results
  if (status && !monitorsSortedByStatus.length && loaded) {
    return <NoMonitorsFound />;
  }

  return (
    <>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="baseline"
        responsive={false}
        wrap={true}
      >
        <EuiFlexItem grow={true}>
          <OverviewPaginationInfo
            page={page}
            loading={!loaded}
            total={status ? monitorsSortedByStatus.length : undefined}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SortFields onSortChange={() => setPage(1)} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GroupFields />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <>
        {groupField === 'none' ? (
          loaded && currentMonitors.length ? (
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
          )
        ) : (
          <GridItemsByGroup
            loaded={loaded}
            currentMonitors={monitors}
            setFlyoutConfigCallback={setFlyoutConfigCallback}
          />
        )}
        <EuiSpacer size="m" />
      </>
      <div ref={intersectionRef}>
        <EuiSpacer size="l" />
      </div>
      {groupField === 'none' && (
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          {currentMonitors.length === monitors.length && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs">{SHOWING_ALL_MONITORS_LABEL}</EuiText>
            </EuiFlexItem>
          )}
          {currentMonitors.length === monitors.length && currentMonitors.length > perPage && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="syntheticsOverviewGridButton"
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
      )}
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

const SHOWING_ALL_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.overview.grid.showingAllMonitors.label',
  {
    defaultMessage: 'Showing all monitors',
  }
);

const SCROLL_TO_TOP_LABEL = i18n.translate('xpack.synthetics.overview.grid.scrollToTop.label', {
  defaultMessage: 'Back to top',
});
