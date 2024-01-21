/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useInventoryViews } from '../../../../hooks/use_inventory_views';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useSnapshot } from '../hooks/use_snaphot';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';
import { useWaffleOptionsContext } from '../hooks/use_waffle_options';
import { useWaffleTimeContext } from '../hooks/use_waffle_time';
import { useSnapshotModeContext } from '../hooks/use_snapshot_mode';
import { Layout } from './layout';

export const SnapshotContainer = () => {
  const { sourceId } = useSourceContext();
  const { metric, groupBy, nodeType, accountId, region, view } = useWaffleOptionsContext();
  const { currentTime } = useWaffleTimeContext();
  const { filterQueryAsJson } = useWaffleFiltersContext();
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
  const { setInterval, setNodes } = useSnapshotModeContext();

  const { currentView } = useInventoryViews();

  useEffect(() => {
    setInterval(interval);
  }, [interval, setInterval]);

  useEffect(() => {
    setNodes(nodes);
  }, [nodes, setNodes]);

  return (
    <Layout
      currentView={currentView}
      loading={loading}
      nodes={nodes}
      reload={reload}
      interval={interval}
    />
  );
};
