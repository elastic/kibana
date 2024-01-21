/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InventoryView } from '../../../../../common/inventory_views';
import { SnapshotNode } from '../../../../../common/http_api';
import { AutoSizer } from '../../../../components/auto_sizer';
import { NodesOverview } from './nodes_overview';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import { DEFAULT_LEGEND, useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { InfraFormatterType } from '../../../../lib/lib';
import { createInventoryMetricFormatter } from '../lib/create_inventory_metric_formatter';
import { createLegend } from '../lib/create_legend';
import { useWaffleViewState } from '../hooks/use_waffle_view_state';
import { BottomDrawer } from './bottom_drawer';

interface Props {
  currentView?: InventoryView | null;
  reload: () => Promise<any>;
  interval: string;
  nodes: SnapshotNode[];
  loading: boolean;
}

export const Layout = React.memo(({ currentView, reload, interval, nodes, loading }: Props) => {
  const [showLoading, setShowLoading] = useState(true);
  const { metric, groupBy, sort, nodeType, view, autoBounds, boundsOverride, legend } =
    useWaffleOptionsContext();
  const { currentTime, jumpToTime, isAutoReloading } = useWaffleTimeContext();
  const { applyFilterQuery } = useWaffleFiltersContext();
  const legendPalette = legend?.palette ?? DEFAULT_LEGEND.palette;
  const legendSteps = legend?.steps ?? DEFAULT_LEGEND.steps;
  const legendReverseColors = legend?.reverseColors ?? DEFAULT_LEGEND.reverseColors;
  const AUTO_REFRESH_INTERVAL = 5 * 1000;

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
    isAutoReloading ? AUTO_REFRESH_INTERVAL : null
  );

  const formatter = useCallback(
    (val: string | number) => createInventoryMetricFormatter(options.metric)(val),
    [options.metric]
  );
  const { onViewChange } = useWaffleViewState();

  useEffect(() => {
    if (currentView) {
      onViewChange(currentView);
    }
  }, [currentView, onViewChange]);

  useEffect(() => {
    // load snapshot data after default view loaded, unless we're not loading a view
    if (currentView != null) {
      reload();
    }
  }, [currentView, reload]);

  useEffect(() => {
    setShowLoading(true);
  }, [options.metric, nodeType]);

  useEffect(() => {
    const hasNodes = nodes && nodes.length;
    // Don't show loading screen when we're auto-reloading
    setShowLoading(!hasNodes);
  }, [nodes]);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem
        css={css`
          position: relative;
        `}
      >
        <AutoSizer bounds>
          {({ bounds: { height = 0 } }) => (
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
              isAutoReloading={isAutoReloading}
              refreshInterval={AUTO_REFRESH_INTERVAL}
            />
          )}
        </AutoSizer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <BottomDrawer interval={interval} formatter={formatter} view={view} nodeType={nodeType} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
