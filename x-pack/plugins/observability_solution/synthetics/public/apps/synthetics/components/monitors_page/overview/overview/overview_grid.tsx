/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, memo, useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import InfiniteLoader from 'react-window-infinite-loader';
import { FixedSizeGrid as ReactWindowGrid, FixedSizeList } from 'react-window';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlexGrid,
  EuiSpacer,
  EuiButtonEmpty,
  EuiText,
  EuiAutoSizer,
  EuiAutoSize,
} from '@elastic/eui';
import { selectOverviewStatus } from '../../../../state/overview_status';
import { useInfiniteScroll } from './use_infinite_scroll';
import { GridItemsByGroup } from './grid_by_group/grid_items_by_group';
import { GroupFields } from './grid_by_group/group_fields';
import {
  quietFetchOverviewAction,
  selectOverviewState,
  selectOverviewTrends,
  setFlyoutConfig,
  trendStatsBatch,
} from '../../../../state/overview';
import { useMonitorsSortedByStatus } from '../../../../hooks/use_monitors_sorted_by_status';
import { OverviewLoader } from './overview_loader';
import { OverviewPaginationInfo } from './overview_pagination_info';
import { FlyoutParamProps, OverviewGridItem } from './overview_grid_item';
import { SortFields } from './sort_fields';
import { NoMonitorsFound } from '../../common/no_monitors_found';
import { MonitorDetailFlyout } from './monitor_detail_flyout';
import { useAbsoluteDate, useStatusByLocationOverview } from '../../../../hooks';
import { useSyntheticsRefreshContext } from '../../../../contexts';

const ITEM_HEIGHT = 172;

export const OverviewGrid = memo(({ monitorsSortedByStatus }: { monitorsSortedByStatus: any }) => {
  const { status } = useSelector(selectOverviewStatus);
  const trends = useSelector(selectOverviewTrends);
  console.log('trends', trends);

  const {
    data: { monitors },
    flyoutConfig,
    loaded,
    pageState,
    groupBy: { field: groupField },
  } = useSelector(selectOverviewState);
  const { perPage } = pageState;
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [vpage, setvpage] = useState<any[]>([]);

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

  const listHeight = Math.min(ITEM_HEIGHT * (monitorsSortedByStatus.length / 4), 800);
  const listRef = React.createRef();
  const infiniteLoaderRef = useRef<{ resetloadMoreItemsCache: () => void }>(null);
  useEffect(() => {
    if (infiniteLoaderRef.current) {
      infiniteLoaderRef.current.resetloadMoreItemsCache();
    }
  }, [lastRefresh]);
  console.log('monitors sorted by status', monitorsSortedByStatus);
  console.log('vpage', vpage);
  console.log('map', JSON.stringify(vpage.flatMap((x) => x).map(({ configId }) => configId)));
  // const { currentMonitors } = useInfiniteScroll({ intersectionRef, monitorsSortedByStatus });

  // const listHeight = React.useMemo(
  //   () => Math.min(ITEM_HEIGHT * (currentMonitors.length / 4), 800),
  //   [currentMonitors.length]
  // );
  // const itemCount = React.useMemo(() => currentMonitors.length, [currentMonitors.length]);
  // Display no monitors found when down, up, or disabled filter produces no results
  if (status && !monitorsSortedByStatus.length && loaded) {
    return <NoMonitorsFound />;
  }

  // return <div>hi</div>;
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
                  isItemLoaded={(idx: number) => vpage[idx] !== undefined}
                  itemCount={monitorsSortedByStatus.length / 4}
                  loadMoreItems={(start: number, stop: number) => {
                    console.log('load more itesm', start, stop);
                    const newRows = [];
                    for (let i = start; i < stop; i++) {
                      newRows.push(monitorsSortedByStatus.slice(i * 4, i * 4 + 4));
                    }
                    const fetchStatsActionPayload = [];
                    for (const newRow of newRows) {
                      for (const item of newRow) {
                        console.log('request for ', item.configId, item.location.id, item);
                        fetchStatsActionPayload.push({
                          configId: item.configId,
                          locationId: item.location.id,
                        });
                      }
                    }
                    dispatch(trendStatsBatch.get(fetchStatsActionPayload));
                    setvpage([...vpage, ...newRows]);
                  }}
                  minimumBatchSize={8}
                  threshold={4}
                >
                  {({ onItemsRendered, ref }) => (
                    <FixedSizeList
                      height={listHeight}
                      width={width}
                      onItemsRendered={onItemsRendered}
                      itemSize={ITEM_HEIGHT}
                      itemCount={monitorsSortedByStatus.length / 4}
                      itemData={monitorsSortedByStatus}
                      ref={listRef}
                    >
                      {(props) => {
                        // console.log('props', props);
                        return (
                          <EuiFlexGroup gutterSize="m" style={props.style}>
                            {props.data
                              .slice(props.index * 4, props.index * 4 + 4)
                              .map((item: any, idx: number) => (
                                <EuiFlexItem key={props.index * 4 + idx}>
                                  <OverviewGridItem
                                    monitor={monitorsSortedByStatus[props.index * 4 + idx]}
                                    onClick={setFlyoutConfigCallback}
                                  />
                                </EuiFlexItem>
                              ))}
                          </EuiFlexGroup>
                        );
                        return <div>hi!</div>;
                      }}
                    </FixedSizeList>
                  )}
                </InfiniteLoader>
                // <ReactWindowGrid
                //   columnCount={4}
                //   columnWidth={width / 4}
                //   rowCount={Math.ceil(monitorsSortedByStatus.length / 4)}
                //   rowHeight={ITEM_HEIGHT}
                //   height={listHeight}
                //   width={width}
                // >
                //   {({ style, ...rest }) => (
                //     <OverviewGridItem
                //       monitor={monitorsSortedByStatus[rest.columnIndex + rest.rowIndex * 4]}
                //       onClick={setFlyoutConfigCallback}
                //       style={style}
                //     />
                //   )}
                // </ReactWindowGrid>
              )}
            </EuiAutoSizer>
          ) : (
            // <EuiFlexGrid
            //   columns={4}
            //   gutterSize="m"
            //   data-test-subj="syntheticsOverviewGridItemContainer"
            // >
            //   {currentMonitors.map((monitor) => (
            //     <EuiFlexItem
            //       key={`${monitor.id}-${monitor.location?.id}`}
            //       data-test-subj="syntheticsOverviewGridItem"
            //     >
            //       <OverviewGridItem monitor={monitor} onClick={setFlyoutConfigCallback} />
            //     </EuiFlexItem>
            //   ))}
            // </EuiFlexGrid>
            // <div>react window here plz</div>
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
                    listRef.current.scrollToItem(0);
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
