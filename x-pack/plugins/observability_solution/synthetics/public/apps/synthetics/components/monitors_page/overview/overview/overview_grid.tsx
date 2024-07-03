/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useRef, memo, useCallback, useEffect } from 'react';
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
    const [vpage, setvpage] = useState<any[]>([]);
    const [maxItem, setMaxItem] = useState(0);
    console.log('vpage', vpage);
    console.log('load data up to row', maxItem);

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

    const listHeight = Math.min(ITEM_HEIGHT * (monitorsSortedByStatus.length / 4), 800);
    console.log('list height', listHeight);
    let items = []; /*
    // feasible technical way to match entities with rules, for rule types we have
    // - today, there are many ways to configure alerts and are tied to data streams
    // - APM, on the other hand, can be entity-based, like a namespace or service, and we can               have a strucured association between the entity and the alert
       - when we get to a point that a user is looking through alist of entities, they will eventually be devfining alerts based on the entity
       - when we're at that point we can see the alerts defined for a given entity. At that point we can allow people to define how well the alert is working to send information about prbolemsn with the given entity and allow them to configure their alerts properly
    // enabling ml/alerts/slo by default, create poc that integrates these with an onboarding flow
    // nginx, apache, problem child, lmd, dga
    */
    const listItems: any = [];
    let ind = 0;
    do {
      items = monitorsSortedByStatus.slice(ind, ind + 4);
      ind += 4;
      if (items.length) listItems.push(items);
    } while (items.length);
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
                      return true;
                      console.log('isitemloaded', idx);
                      return vpage[idx] !== undefined;
                    }}
                    itemCount={listItems.length}
                    loadMoreItems={(_start: number, stop: number) => {
                      setMaxItem(stop);
                      // console.log('load more items', start, stop);
                      // const newRows = [];
                      // const slice = listItems.slice(start, stop);
                      // console.log('slice for', start, stop, slice, monitorsSortedByStatus);
                      // const mapped = slice
                      //   .flatMap((x: any) => x)
                      //   .map(({ configId, location }: any) => ({
                      //     configId,
                      //     locationId: location.id,
                      //   }));
                      // console.log('mapped', mapped);
                      // console.log('dispatching for ', start, stop);
                      // dispatch(trendStatsBatch.get(mapped));
                      // setvpage([...vpage, ...slice]);
                    }}
                    minimumBatchSize={8}
                    threshold={8}
                  >
                    {({ onItemsRendered, ref }) => (
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
                          console.log('the props', props);
                          return (
                            <EuiFlexGroup gutterSize="m" style={props.style}>
                              {props.data[props.index].map((item: any, idx: number) => (
                                <EuiFlexItem key={props.index * 4 + idx}>
                                  <MetricItem
                                    monitor={monitorsSortedByStatus[props.index * 4 + idx]}
                                    onClick={setFlyoutConfigCallback}
                                  />
                                </EuiFlexItem>
                              ))}
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
