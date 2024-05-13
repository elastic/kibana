/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiBasicTableProps, Pagination } from '@elastic/eui';
import { EuiBasicTable } from '@elastic/eui';

import type { InferenceEndpointUI } from '../../../../../../common/ui/types';

interface InferenceEndpointsTableProps {
  columns: EuiBasicTableProps<InferenceEndpointUI>['columns'];
  data: InferenceEndpointUI[];
  onChange: EuiBasicTableProps<InferenceEndpointUI>['onChange'];
  pagination: Pagination;
  sorting: EuiBasicTableProps<InferenceEndpointUI>['sorting'];
}

export const InferenceEndpointsTable: React.FC<InferenceEndpointsTableProps> = ({
  columns,
  data,
  onChange,
  pagination,
  sorting,
}) => {
  return (
    <EuiBasicTable
      columns={columns}
      data-test-subj="inference-endpoints-table"
      itemId="id"
      items={data}
      onChange={onChange}
      pagination={pagination}
      sorting={sorting}
    />
  );
};
