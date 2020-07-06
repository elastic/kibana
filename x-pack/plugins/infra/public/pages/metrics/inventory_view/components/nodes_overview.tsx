/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';

import { InventoryItemType } from '../../../../../common/inventory_models/types';
import { euiStyled } from '../../../../../../observability/public';
import { InfraWaffleMapBounds, InfraWaffleMapOptions, InfraFormatter } from '../../../../lib/lib';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { Map } from './waffle/map';
import { TableView } from './table_view';
import { SnapshotNode } from '../../../../../common/http_api/snapshot_api';
import { calculateBoundsFromNodes } from '../lib/calculate_bounds_from_nodes';

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
  if (loading) {
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
    <MapContainer>
      <Map
        nodeType={nodeType}
        nodes={nodes}
        options={options}
        formatter={formatter}
        currentTime={currentTime}
        onFilter={handleDrilldown}
        bounds={bounds}
        dataBounds={dataBounds}
      />
    </MapContainer>
  );
};

const TableContainer = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.l};
`;

const MapContainer = euiStyled.div`
  position: absolute;
  display: flex;
  top: 70px;
  right: 0;
  bottom: 0;
  left: 0;
`;
