/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { SnapshotNode } from '../../../../../common/http_api';
import { SavedView } from '../../../../containers/saved_view/saved_view';
import { AutoSizer } from '../../../../components/auto_sizer';
import { NodesOverview } from './nodes_overview';
import { calculateBoundsFromNodes } from '../lib/calculate_bounds_from_nodes';
import { PageContent } from '../../../../components/page';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import {
  DEFAULT_LEGEND,
  useWaffleOptionsContext,
  WaffleLegendOptions,
} from '../hooks/use_waffle_options';
import { InfraFormatterType, InfraWaffleMapBounds } from '../../../../lib/lib';
import { Toolbar } from './toolbars/toolbar';
import { ViewSwitcher } from './waffle/view_switcher';
import { createInventoryMetricFormatter } from '../lib/create_inventory_metric_formatter';
import { createLegend } from '../lib/create_legend';
import { useWaffleViewState } from '../hooks/use_waffle_view_state';
import { BottomDrawer } from './bottom_drawer';
import { LegendControls } from './waffle/legend_controls';

interface Props {
  shouldLoadDefault: boolean;
  currentView: SavedView<any> | null;
  reload: () => Promise<any>;
  interval: string;
  nodes: SnapshotNode[];
  loading: boolean;
}

interface LegendControlOptions {
  auto: boolean;
  bounds: InfraWaffleMapBounds;
  legend: WaffleLegendOptions;
}

export const Layout = React.memo(
  ({ shouldLoadDefault, currentView, reload, interval, nodes, loading }: Props) => {
    const [showLoading, setShowLoading] = useState(true);
    const {
      metric,
      groupBy,
      sort,
      nodeType,
      changeView,
      view,
      autoBounds,
      boundsOverride,
      legend,
      changeBoundsOverride,
      changeAutoBounds,
      changeLegend,
    } = useWaffleOptionsContext();
    const { currentTime, jumpToTime, isAutoReloading } = useWaffleTimeContext();
    const { applyFilterQuery } = useWaffleFiltersContext();
    const legendPalette = legend?.palette ?? DEFAULT_LEGEND.palette;
    const legendSteps = legend?.steps ?? DEFAULT_LEGEND.steps;
    const legendReverseColors = legend?.reverseColors ?? DEFAULT_LEGEND.reverseColors;

    const options = {
      formatter: InfraFormatterType.percent,
      formatTemplate: '{{value}}',
      legend: createLegend(legendPalette, legendSteps, legendReverseColors),
      metric,
      sort,
      groupBy,
    };

    useInterval(
      () => {
        if (!loading) {
          jumpToTime(Date.now());
        }
      },
      isAutoReloading ? 5000 : null
    );

    const dataBounds = calculateBoundsFromNodes(nodes);
    const bounds = autoBounds ? dataBounds : boundsOverride;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    const formatter = useCallback(createInventoryMetricFormatter(options.metric), [options.metric]);
    const { onViewChange } = useWaffleViewState();

    useEffect(() => {
      if (currentView) {
        onViewChange(currentView);
      }
    }, [currentView, onViewChange]);

    useEffect(() => {
      // load snapshot data after default view loaded, unless we're not loading a view
      if (currentView != null || !shouldLoadDefault) {
        reload();
      }

      /**
       * INFO: why disable exhaustive-deps
       * We need to wait on the currentView not to be null because it is loaded async and could change the view state.
       * We don't actually need to watch the value of currentView though, since the view state will be synched up by the
       * changing params in the reload method so we should only "watch" the reload method.
       *
       * TODO: Should refactor this in the future to make it more clear where all the view state is coming
       * from and it's precedence [query params, localStorage, defaultView, out of the box view]
       */
      /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [reload, shouldLoadDefault]);

    useEffect(() => {
      setShowLoading(true);
    }, [options.metric, nodeType]);

    useEffect(() => {
      const hasNodes = nodes && nodes.length;
      // Don't show loading screen when we're auto-reloading
      setShowLoading(!hasNodes);
    }, [nodes]);

    const handleLegendControlChange = useCallback(
      (opts: LegendControlOptions) => {
        changeBoundsOverride(opts.bounds);
        changeAutoBounds(opts.auto);
        changeLegend(opts.legend);
      },
      [changeBoundsOverride, changeAutoBounds, changeLegend]
    );

    return (
      <>
        <PageContent>
          <AutoSizer bounds>
            {({ measureRef: pageMeasureRef, bounds: { width = 0 } }) => (
              <MainContainer ref={pageMeasureRef}>
                <AutoSizer bounds>
                  {({
                    measureRef: topActionMeasureRef,
                    bounds: { height: topActionHeight = 0 },
                  }) => (
                    <>
                      <TopActionContainer ref={topActionMeasureRef}>
                        <EuiFlexGroup
                          justifyContent="spaceBetween"
                          alignItems="center"
                          gutterSize="m"
                        >
                          <Toolbar nodeType={nodeType} currentTime={currentTime} />
                          <EuiFlexGroup
                            responsive={false}
                            style={{ margin: 0, justifyContent: 'end' }}
                          >
                            {view === 'map' && (
                              <EuiFlexItem grow={false}>
                                <LegendControls
                                  options={legend != null ? legend : DEFAULT_LEGEND}
                                  dataBounds={dataBounds}
                                  bounds={bounds}
                                  autoBounds={autoBounds}
                                  boundsOverride={boundsOverride}
                                  onChange={handleLegendControlChange}
                                />
                              </EuiFlexItem>
                            )}
                            <EuiFlexItem grow={false}>
                              <ViewSwitcher view={view} onChange={changeView} />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexGroup>
                      </TopActionContainer>
                      <AutoSizer bounds>
                        {({ measureRef, bounds: { height = 0 } }) => (
                          <>
                            <NodesOverview
                              nodes={nodes}
                              options={options}
                              nodeType={nodeType}
                              loading={loading}
                              showLoading={showLoading}
                              reload={reload}
                              onDrilldown={applyFilterQuery}
                              currentTime={currentTime}
                              view={view}
                              autoBounds={autoBounds}
                              boundsOverride={boundsOverride}
                              formatter={formatter}
                              bottomMargin={height}
                              topMargin={topActionHeight}
                            />
                            {view === 'map' && (
                              <BottomDrawer
                                measureRef={measureRef}
                                interval={interval}
                                formatter={formatter}
                                width={width}
                              />
                            )}
                          </>
                        )}
                      </AutoSizer>
                    </>
                  )}
                </AutoSizer>
              </MainContainer>
            )}
          </AutoSizer>
        </PageContent>
      </>
    );
  }
);

const MainContainer = euiStyled.div`
  position: relative;
  flex: 1 1 auto;
`;

const TopActionContainer = euiStyled.div`
  padding: ${(props) => `12px ${props.theme.eui.paddingSizes.m}`};
`;
