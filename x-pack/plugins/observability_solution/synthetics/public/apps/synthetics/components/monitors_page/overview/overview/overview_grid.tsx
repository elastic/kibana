/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, memo, useCallback, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import InfiniteLoader from 'react-window-infinite-loader';
import { FixedSizeList } from 'react-window';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonEmpty,
  EuiText,
  EuiAutoSizer,
  EuiAutoSize,
} from '@elastic/eui';
import { selectOverviewStatus } from '../../../../state/overview_status';
import { GridItemsByGroup } from './grid_by_group/grid_items_by_group';
import { GroupFields } from './grid_by_group/group_fields';
import {
  quietFetchOverviewAction,
  refreshOverviewTrends,
  selectOverviewState,
  selectOverviewTrends,
  setFlyoutConfig,
  trendStatsBatch,
} from '../../../../state/overview';
import { OverviewLoader } from './overview_loader';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { SortFields } from './sort_fields';
import { NoMonitorsFound } from '../../common/no_monitors_found';
import { MonitorDetailFlyout } from './monitor_detail_flyout';
import { useSyntheticsRefreshContext } from '../../../../contexts';
import { MetricItem } from './metric_item';
import { FlyoutParamProps } from './types';
import { MonitorOverviewItem } from '../types';

const ITEM_HEIGHT = 172;
const ROW_COUNT = 4;

export const OverviewGrid = memo(
  ({ monitorsSortedByStatus }: { monitorsSortedByStatus: MonitorOverviewItem[] }) => {
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
    const [maxItem, setMaxItem] = useState(0);

    const trendData = useSelector(selectOverviewTrends);
    // offload the fetching of trend data to a new effect and the list will work better

    const dispatch = useDispatch();
    const intersectionRef = useRef(null);

    const setFlyoutConfigCallback = useCallback(
      (params: FlyoutParamProps) => dispatch(setFlyoutConfig(params)),
      [dispatch]
    );
    const hideFlyout = useCallback(() => dispatch(setFlyoutConfig(null)), [dispatch]);
    const { lastRefresh } = useSyntheticsRefreshContext();
    const forceRefreshCallback = useCallback(
      () => dispatch(quietFetchOverviewAction.get(pageState)),
      [dispatch, pageState]
    );

    useEffect(() => {
      if (monitorsSortedByStatus.length && maxItem) {
        const batch = [];
        const slice = monitorsSortedByStatus.slice(0, (maxItem + 1) * ROW_COUNT);
        for (const item of slice) {
          if (trendData[item.configId + item.location.id] === undefined) {
            batch.push({ configId: item.configId, locationId: item.location.id });
          }
        }
        if (batch.length) dispatch(trendStatsBatch.get(batch));
      }
    }, [dispatch, maxItem, monitorsSortedByStatus, trendData]);

    const listHeight = Math.min(ITEM_HEIGHT * (monitorsSortedByStatus.length / ROW_COUNT), 800);
    const listItems: Array<Array<{ configId: string; location: { id: string } }>> = useMemo(() => {
      const acc = [];
      for (let i = 0; i < monitorsSortedByStatus.length; i += ROW_COUNT) {
        acc.push(monitorsSortedByStatus.slice(i, i + ROW_COUNT));
      }
      return acc;
    }, [monitorsSortedByStatus]);

    const listRef: React.LegacyRef<FixedSizeList<any>> | undefined = React.createRef();
    const infiniteLoaderRef: React.LegacyRef<InfiniteLoader> = React.createRef();
    useEffect(() => {
      dispatch(refreshOverviewTrends.get());
    }, [dispatch, lastRefresh]);

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
        <div style={{ height: listHeight }}>
          {groupField === 'none' ? (
            loaded && monitorsSortedByStatus.length ? (
              <EuiAutoSizer>
                {({ width }: EuiAutoSize) => (
                  <InfiniteLoader
                    ref={infiniteLoaderRef}
                    isItemLoaded={(idx: number) => {
                      return listItems[idx].every(
                        (m: any) => !!trendData[m.configId + m.location.id]
                      );
                    }}
                    itemCount={listItems.length}
                    loadMoreItems={(_start: number, stop: number) => {
                      setMaxItem(Math.max(maxItem, stop));
                    }}
                    minimumBatchSize={20}
                    threshold={12}
                  >
                    {({ onItemsRendered }) => (
                      <FixedSizeList
                        height={800}
                        width={width}
                        onItemsRendered={onItemsRendered}
                        itemSize={ITEM_HEIGHT}
                        itemCount={listItems.length}
                        itemData={listItems}
                        ref={listRef}
                      >
                        {(props) => {
                          return (
                            <EuiFlexGroup gutterSize="m" style={{ ...props.style }}>
                              {props.data[props.index].map((item: any, idx: number) => (
                                <EuiFlexItem key={props.index * ROW_COUNT + idx}>
                                  <MetricItem
                                    monitor={monitorsSortedByStatus[props.index * ROW_COUNT + idx]}
                                    onClick={setFlyoutConfigCallback}
                                  />
                                </EuiFlexItem>
                              ))}
                              {props.data[props.index].length % ROW_COUNT !== 0 &&
                                // Adds empty items to fill out row
                                Array.from({
                                  length: ROW_COUNT - props.data[props.index].length,
                                }).map((_, idx) => <EuiFlexItem key={idx} />)}
                            </EuiFlexGroup>
                          );
                        }}
                      </FixedSizeList>
                    )}
                  </InfiniteLoader>
                )}
              </EuiAutoSizer>
            ) : (
              <OverviewLoader />
            )
          ) : (
            <GridItemsByGroup
              loaded={loaded}
              currentMonitors={monitorsSortedByStatus}
              setFlyoutConfigCallback={setFlyoutConfigCallback}
            />
          )}
          <EuiSpacer size="m" />
        </div>
        <div ref={intersectionRef}>
          <EuiSpacer size="l" />
        </div>
        {groupField === 'none' && (
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            {monitorsSortedByStatus.length === monitors.length && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{SHOWING_ALL_MONITORS_LABEL}</EuiText>
              </EuiFlexItem>
            )}
            {monitorsSortedByStatus.length === monitors.length &&
              monitorsSortedByStatus.length > perPage && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="syntheticsOverviewGridButton"
                    onClick={() => {
                      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                      listRef.current?.scrollToItem(0);
                    }}
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
  }
);

const SHOWING_ALL_MONITORS_LABEL = i18n.translate(
  'xpack.synthetics.overview.grid.showingAllMonitors.label',
  {
    defaultMessage: 'Showing all monitors',
  }
);

const SCROLL_TO_TOP_LABEL = i18n.translate('xpack.synthetics.overview.grid.scrollToTop.label', {
  defaultMessage: 'Back to top',
});
