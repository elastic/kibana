/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CriteriaWithPagination,
  EuiBadge,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';
import React, { useState } from 'react';
import { asDynamicBytes } from '@kbn/observability-plugin/common';
import { StorageExplorerHostDetails } from '../../../common/storage_explorer';

interface Props {
  data?: StorageExplorerHostDetails[];
}
export function HostsTable({ data = [] }: Props) {
  const [pagination, setPagination] = useState({ pageIndex: 0 });

  function onTableChange({ page: { index } }: CriteriaWithPagination<StorageExplorerHostDetails>) {
    setPagination({ pageIndex: index });
  }

  const columns: Array<EuiBasicTableColumn<StorageExplorerHostDetails>> = [
    {
      field: 'projectId',
      name: 'Project ID',
      sortable: true,
    },
    {
      field: 'hostName',
      name: 'Machine',
      sortable: true,
    },
    {
      field: 'hostId',
      name: 'Machine ID',
      sortable: true,
    },
    {
      field: 'probabilisticValues',
      name: 'Probabilistic Profiling values',
      sortable: true,
      render: (probabilisticValues: StorageExplorerHostDetails['probabilisticValues']) => {
        return (
          <EuiFlexGroup gutterSize="s">
            {probabilisticValues.map((value, index) => {
              return (
                <EuiFlexItem key={index} grow={false}>
                  <EuiBadge color="hollow">{value}</EuiBadge>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'totalMetricsSize',
      name: 'Metrics data',
      sortable: true,
      render: (size: StorageExplorerHostDetails['totalMetricsSize']) => asDynamicBytes(size),
    },
    {
      field: 'totalEventsSize',
      name: 'Events data',
      sortable: true,
      render: (size: StorageExplorerHostDetails['totalEventsSize']) => asDynamicBytes(size),
    },
    {
      field: 'totalSize',
      name: 'Total data',
      sortable: true,
      render: (size: StorageExplorerHostDetails['totalSize']) => asDynamicBytes(size),
    },
  ];
  const sorting = {
    sort: {
      field: 'hostName',
      direction: 'desc' as const,
    },
  };
  return (
    <EuiInMemoryTable
      items={data}
      columns={columns}
      sorting={sorting}
      pagination={{ pageSize: 10, showPerPageOptions: false, ...pagination }}
      onTableChange={onTableChange}
    />
  );
}
