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
import { SnapshotNode } from '../../../../../common/http_api';
import { HostsTableColumns } from './hosts_table_columns';
interface Props {
  dataView: DataView;
  timeRange: TimeRange;
  query: Query;
  nodes: SnapshotNode[];
}

export const HostsTable: React.FunctionComponent<Props> = ({
  dataView,
  timeRange,
  query,
  nodes,
}) => {
  // return <div> eui table here from nodes </div>;

  const items = [
    {
      os: 'MacOs',
      cpuCores: 10,
      name: 'Jennys-MBP.fritz.box',
      rx: {
        avg: 1234,
      },
      tx: {
        avg: 321,
      },
      memory: {
        avg: 543,
      },
      servicesOnHost: 10,
      averageMemoryUsagePercent: 5,
    },
    {
      os: 'Ubuntu',
      cpuCores: 4,
      name: 'Jennys-Ubuntu.fritz.box',
      rx: {
        avg: 223,
      },
      tx: {
        avg: 775,
      },
      memory: {
        avg: 3323,
      },
      servicesOnHost: 4,
      averageMemoryUsagePercent: 55,
    },
  ];

  return (
    <EuiBasicTable
      tableCaption="Infrastructure metrics for hosts"
      items={items}
      columns={HostsTableColumns}
    />
  );
};
