/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { getBreakpoint } from '@elastic/eui';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { InventoryItemType } from '../../../../../common/inventory_models/types';
import { InfraWaffleMapBounds, InfraWaffleMapOptions, InfraFormatter } from '../../../../lib/lib';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { Map } from './waffle/map';
import { TableView } from './table_view';
import { SnapshotNode } from '../../../../../common/http_api/snapshot_api';
import { calculateBoundsFromNodes } from '../lib/calculate_bounds_from_nodes';
import { Legend } from './waffle/legend';

export interface KueryFilterQuery {
  kind: 'kuery';
  expression: string;
}

interface Props {
  options: InfraWaffleMapOptions;
  nodeType: InventoryItemType;
  nodes: SnapshotNode[];
  loading: boolean;
  reload: () => void;
  onDrilldown: (filter: KueryFilterQuery) => void;
  currentTime: number;
  view: string;
  boundsOverride: InfraWaffleMapBounds;
  autoBounds: boolean;
  formatter: InfraFormatter;
  bottomMargin: number;
  topMargin: number;
  showLoading: boolean;
}

export const NodesOverview = ({
  autoBounds,
  boundsOverride,
  loading,
  nodes,
  nodeType,
  reload,
  view,
  currentTime,
  options,
  formatter,
  onDrilldown,
  bottomMargin,
  topMargin,
  showLoading,
}: Props) => {
  const handleDrilldown = useCallback(
    (filter: string) => {
      onDrilldown({
        kind: 'kuery',
        expression: filter,
      });
      return;
    },
    [onDrilldown]
  );

  const noData = !loading && nodes && nodes.length === 0;
  if (loading && showLoading) {
    // Don't show loading screen when we're auto-reloading
    return (
      <InfraLoadingPanel
        height="100%"
        width="100%"
        text={i18n.translate('xpack.infra.waffle.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    );
  } else if (noData) {
    return (
      <NoData
        titleText={i18n.translate('xpack.infra.waffle.noDataTitle', {
          defaultMessage: 'There is no data to display.',
        })}
        bodyText={i18n.translate('xpack.infra.waffle.noDataDescription', {
          defaultMessage: 'Try adjusting your time or filter.',
        })}
        refetchText={i18n.translate('xpack.infra.waffle.checkNewDataButtonLabel', {
          defaultMessage: 'Check for new data',
        })}
        onRefetch={() => {
          reload();
        }}
        testString="noMetricsDataPrompt"
      />
    );
  }
  const dataBounds = calculateBoundsFromNodes(nodes);
  const bounds = autoBounds ? dataBounds : boundsOverride;
  const isStatic = ['xs', 's'].includes(getBreakpoint(window.innerWidth)!);

  if (view === 'table') {
    return (
      <TableContainer>
        <TableView
          nodeType={nodeType}
          nodes={nodes}
          options={options}
          formatter={formatter}
          currentTime={currentTime}
          onFilter={handleDrilldown}
        />
      </TableContainer>
    );
  }
  return (
    <MapContainer top={topMargin} positionStatic={isStatic}>
      <Map
        nodeType={nodeType}
        nodes={nodes}
        options={options}
        formatter={formatter}
        currentTime={currentTime}
        onFilter={handleDrilldown}
        bounds={bounds}
        dataBounds={dataBounds}
        bottomMargin={bottomMargin}
        staticHeight={isStatic}
      />
      <Legend
        formatter={formatter}
        bounds={bounds}
        dataBounds={dataBounds}
        legend={options.legend}
      />
    </MapContainer>
  );
};

const TableContainer = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.l};
`;

const MapContainer = euiStyled.div<{ top: number; positionStatic: boolean }>`
  position: ${(props) => (props.positionStatic ? 'static' : 'absolute')};
  display: flex;
  top: ${(props) => props.top}px;
  right: 0;
  bottom: 0;
  left: 0;
`;
