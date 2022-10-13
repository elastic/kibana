/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query, TimeRange } from '@kbn/es-query';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiBasicTable } from '@elastic/eui';
import { SnapshotNode, SnapshotNodeMetric } from '../../../../../common/http_api';
import { HostsTableColumns, HostMetics } from './hosts_table_columns';
interface Props {
  dataView: DataView;
  timeRange: TimeRange;
  query: Query;
  nodes: SnapshotNode[];
}

type MappedMetrics = Record<keyof HostMetics, SnapshotNodeMetric>;

export const HostsTable: React.FunctionComponent<Props> = ({
  dataView,
  timeRange,
  query,
  nodes,
}) => {
  const items = nodes.map(({ metrics, path }) => ({
    ...path[0],
    ...metrics.reduce((data, metric) => {
      data[metric.name as keyof HostMetics] = metric;
      return data;
    }, {} as MappedMetrics),
  }));

  return (
    <EuiBasicTable
      tableCaption="Infrastructure metrics for hosts"
      items={items}
      columns={HostsTableColumns}
    />
  );
};
