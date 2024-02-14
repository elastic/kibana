/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { InitializedInventoryPageState } from '../../../../observability_infra/inventory_page/state';
import { convertKueryToElasticSearchQuery } from '../../../../utils/kuery';
import { useSourceContext } from '../../../../containers/metrics_source';
import { SnapshotNode } from '../../../../../common/http_api';
import { useSnapshot } from '../hooks/use_snaphot';

interface RenderProps {
  reload: () => Promise<any>;
  interval: string;
  nodes: SnapshotNode[];
  loading: boolean;
}

interface Props {
  render: React.FC<RenderProps>;
  inventoryPageState: InitializedInventoryPageState;
}
export const SnapshotContainer = ({ render, inventoryPageState }: Props) => {
  const { sourceId, createDerivedIndexPattern } = useSourceContext();
  const indexPattern = createDerivedIndexPattern();

  const filterQueryAsJson = useMemo(
    () =>
      convertKueryToElasticSearchQuery(inventoryPageState.context.filter.expression, indexPattern),
    [indexPattern, inventoryPageState.context.filter.expression]
  );

  const { metric, groupBy, nodeType, accountId, region, view } = inventoryPageState.context.options;
  const { currentTime } = inventoryPageState.context.time;
  const {
    loading,
    nodes,
    reload,
    interval = '60s',
  } = useSnapshot(
    {
      filterQuery: filterQueryAsJson,
      metrics: [metric],
      groupBy,
      nodeType,
      sourceId,
      currentTime,
      accountId,
      region,
      sendRequestImmediately: false,
      includeTimeseries: view === 'table',
    },
    {
      abortable: true,
    }
  );

  return render({ loading, nodes, reload, interval });
};
