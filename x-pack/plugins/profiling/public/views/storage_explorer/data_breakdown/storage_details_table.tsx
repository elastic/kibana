/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CriteriaWithPagination,
  EuiBasicTableColumn,
  EuiInMemoryTable,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { asDynamicBytes, asInteger } from '@kbn/observability-plugin/common';
import { StorageDetailsPerIndex } from '../../../../common/storage_explorer';
import { NOT_AVAILABLE_LABEL } from '../../../../common';

interface Props {
  data?: StorageDetailsPerIndex[];
}

const sorting = {
  sort: {
    field: 'sizeInBytes',
    direction: 'desc' as const,
  },
};

export function StorageDetailsTable({ data = [] }: Props) {
  const [pagination, setPagination] = useState({ pageIndex: 0 });

  function onTableChange({ page: { index } }: CriteriaWithPagination<StorageDetailsPerIndex>) {
    setPagination({ pageIndex: index });
  }

  const columns: Array<EuiBasicTableColumn<StorageDetailsPerIndex>> = useMemo(
    () => [
      {
        field: 'indexName',
        name: i18n.translate(
          'xpack.profiling.storageExplorer.dataBreakdown.storageDetailsTable.index',
          { defaultMessage: 'Index' }
        ),
        sortable: true,
      },
      {
        field: 'primaryShardsCount',
        width: '150px',
        name: i18n.translate(
          'xpack.profiling.storageExplorer.dataBreakdown.storageDetailsTable.primaries',
          { defaultMessage: 'Primaries' }
        ),
        render: (_, { primaryShardsCount }) => primaryShardsCount ?? NOT_AVAILABLE_LABEL,
        sortable: true,
      },
      {
        field: 'replicaShardsCount',
        width: '150px',
        name: i18n.translate(
          'xpack.profiling.storageExplorer.dataBreakdown.storageDetailsTable.replicas',
          { defaultMessage: 'Replicas' }
        ),
        render: (_, { replicaShardsCount }) => replicaShardsCount ?? NOT_AVAILABLE_LABEL,
        sortable: true,
      },
      {
        field: 'docCount',
        width: '150px',
        name: i18n.translate(
          'xpack.profiling.storageExplorer.dataBreakdown.storageDetailsTable.docCount',
          { defaultMessage: 'Doc count' }
        ),
        sortable: true,
        render: (_, { docCount }) => (docCount ? asInteger(docCount) : NOT_AVAILABLE_LABEL),
      },
      {
        field: 'sizeInBytes',
        width: '150px',
        name: i18n.translate(
          'xpack.profiling.storageExplorer.dataBreakdown.storageDetailsTable.storageSize',
          { defaultMessage: 'Storage size' }
        ),
        sortable: true,
        render: (_, { sizeInBytes }) =>
          sizeInBytes ? asDynamicBytes(sizeInBytes) : NOT_AVAILABLE_LABEL,
      },
      {
        field: 'dataStream',
        name: i18n.translate(
          'xpack.profiling.storageExplorer.dataBreakdown.storageDetailsTable.dataStream',
          { defaultMessage: 'Data stream' }
        ),
        sortable: true,
        render: (_, { dataStream }) => dataStream ?? NOT_AVAILABLE_LABEL,
      },
      {
        field: 'lifecyclePhase',
        width: '150px',
        name: i18n.translate(
          'xpack.profiling.storageExplorer.dataBreakdown.storageDetailsTable.lifecyclePhase',
          { defaultMessage: 'Lifecycle phase' }
        ),
        sortable: true,
        render: (_, { lifecyclePhase }) => lifecyclePhase ?? NOT_AVAILABLE_LABEL,
      },
    ],
    []
  );
  return (
    <>
      <EuiTitle size="xxxs">
        <EuiText>
          {i18n.translate(
            'xpack.profiling.storageExplorer.dataBreakdown.storageDetailsTable.title',
            { defaultMessage: 'Indices breakdown' }
          )}
        </EuiText>
      </EuiTitle>
      <EuiInMemoryTable
        items={data}
        columns={columns}
        sorting={sorting}
        pagination={{ pageSize: 10, showPerPageOptions: false, ...pagination }}
        onTableChange={onTableChange}
      />
    </>
  );
}
