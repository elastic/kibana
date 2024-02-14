/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  InventoryPageCallbacks,
  InitializedInventoryPageState,
} from '../../../../observability_infra/inventory_page/state';
import { InventoryFiltersState, InventoryView } from '../../../../../common/inventory_views';
import { SnapshotNode } from '../../../../../common/http_api';
import { AutoSizer } from '../../../../components/auto_sizer';
import { NodesOverview } from './nodes_overview';
import { calculateBoundsFromNodes } from '../lib/calculate_bounds_from_nodes';
import { PageContent } from '../../../../components/page';
import { DEFAULT_LEGEND, WaffleLegendOptions } from '../hooks/use_waffle_options';
import { InfraFormatterType, InfraWaffleMapBounds } from '../../../../lib/lib';
import { Toolbar } from './toolbars/toolbar';
import { ViewSwitcher } from './waffle/view_switcher';
import { createInventoryMetricFormatter } from '../lib/create_inventory_metric_formatter';
import { createLegend } from '../lib/create_legend';
import { BottomDrawer } from './bottom_drawer';
import { LegendControls } from './waffle/legend_controls';
import { TryItButton } from '../../../../components/try_it_button';

interface Props {
  currentView: InventoryView;
  reload: () => Promise<any>;
  interval: string;
  nodes: SnapshotNode[];
  loading: boolean;
  inventoryPageCallbacks: InventoryPageCallbacks;
  inventoryPageState: InitializedInventoryPageState;
}

interface LegendControlOptions {
  auto: boolean;
  bounds: InfraWaffleMapBounds;
  legend: WaffleLegendOptions;
}

const HOSTS_LINK_LOCAL_STORAGE_KEY = 'inventoryUI:hostsLinkClicked';

export const Layout = React.memo(
  ({
    currentView,
    inventoryPageCallbacks,
    inventoryPageState,
    reload,
    interval,
    nodes,
    loading,
  }: Props) => {
    const [showLoading, setShowLoading] = useState(true);

    const {
      legend,
      metric,
      sort,
      groupBy,
      autoBounds,
      boundsOverride,
      nodeType,
      view,
      autoReload,
      time = Date.now(),
    } = currentView.attributes;
    const legendPalette = legend?.palette ?? DEFAULT_LEGEND.palette;
    const legendSteps = legend?.steps ?? DEFAULT_LEGEND.steps;
    const legendReverseColors = legend?.reverseColors ?? DEFAULT_LEGEND.reverseColors;

    const [hostsLinkClicked, setHostsLinkClicked] = useLocalStorage<boolean>(
      HOSTS_LINK_LOCAL_STORAGE_KEY,
      false
    );
    const hostsLinkClickedRef = useRef<boolean | undefined>(hostsLinkClicked);
    const AUTO_REFRESH_INTERVAL = 5 * 1000;

    const options = {
      formatter: InfraFormatterType.percent,
      formatTemplate: '{{value}}',
      legend: createLegend(legendPalette, legendSteps, legendReverseColors),
      metric,
      sort,
      groupBy,
    };

    // useInterval(
    //   () => {
    //     if (!loading) {
    //       jumpToTime(Date.now());
    //     }
    //   },
    //   isAutoReloading ? AUTO_REFRESH_INTERVAL : null
    // );

    const dataBounds = calculateBoundsFromNodes(nodes);
    const bounds = autoBounds ? dataBounds : boundsOverride;

    const formatter = useCallback(
      (val: string | number) => createInventoryMetricFormatter(options.metric)(val),
      [options.metric]
    );

    useEffect(() => {
      // load snapshot data after default view loaded, unless we're not loading a view
      if (currentView != null) {
        reload();
      }
    }, [currentView, reload]);

    useEffect(() => {
      setShowLoading(true);
    }, [metric, nodeType]);

    useEffect(() => {
      const hasNodes = nodes && nodes.length;
      // Don't show loading screen when we're auto-reloading
      setShowLoading(!hasNodes);
    }, [nodes]);

    const handleLegendControlChange = useCallback(
      (opts: LegendControlOptions) => {
        inventoryPageCallbacks.updateOptions({
          legend: opts.legend,
          autoBounds: opts.auto,
          boundsOverride: opts.bounds,
        });
      },
      [inventoryPageCallbacks]
    );

    const applyFilterQuery = useCallback(
      (filterQuery: InventoryFiltersState) => {
        inventoryPageCallbacks.updateFilter(filterQuery);
      },
      [inventoryPageCallbacks]
    );

    return (
      <>
        <PageContent>
          <EuiFlexGroup direction="column" gutterSize="s">
            <TopActionContainer grow={false}>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="m">
                <Toolbar
                  nodeType={nodeType}
                  currentTime={time}
                  inventoryPageCallbacks={inventoryPageCallbacks}
                  inventoryPageState={inventoryPageState}
                />
                <EuiFlexGroup
                  responsive={false}
                  css={css`
                    margin: 0;
                    justify-content: flex-end;
                  `}
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
                    {/* eslint-disable-next-line no-console */}
                    <ViewSwitcher view={view} onChange={() => console.log('')} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexGroup>
            </TopActionContainer>
            <EuiFlexItem grow={false}>
              {!hostsLinkClickedRef.current && nodeType === 'host' && (
                <TryItButton
                  data-test-subj="inventory-hostsView-link"
                  label={i18n.translate('xpack.infra.layout.hostsLandingPageLink', {
                    defaultMessage: 'Introducing a new Hosts analysis experience',
                  })}
                  link={{
                    app: 'metrics',
                    pathname: '/hosts',
                  }}
                  experimental
                  onClick={() => {
                    setHostsLinkClicked(true);
                  }}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={css`
                position: relative;
                flex: 1 1 auto;
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
                    currentTime={time}
                    view={view}
                    autoBounds={autoBounds}
                    boundsOverride={boundsOverride}
                    formatter={formatter}
                    bottomMargin={height}
                    isAutoReloading={autoReload}
                    refreshInterval={AUTO_REFRESH_INTERVAL}
                  />
                )}
              </AutoSizer>
            </EuiFlexItem>
          </EuiFlexGroup>
        </PageContent>
        <BottomDrawer interval={interval} formatter={formatter} view={view} nodeType={nodeType} />
      </>
    );
  }
);

const TopActionContainer = euiStyled(EuiFlexItem)`
  padding: ${(props) => `${props.theme.eui.euiSizeM} 0`};
`;
