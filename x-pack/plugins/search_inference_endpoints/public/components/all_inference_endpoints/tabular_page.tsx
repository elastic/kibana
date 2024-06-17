/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { useTableData } from '../../hooks/use_table_data';

import { useAllInferenceEndpointsState } from '../../hooks/use_all_inference_endpoints_state';
import { EndpointsTable } from './endpoints_table';
import { useTableColumns } from './table_columns';
import { TableSearch } from './search/table_search';

interface TabularPageProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
}

export const TabularPage: React.FC<TabularPageProps> = ({ inferenceEndpoints }) => {
  const [searchKey, setSearchKey] = React.useState('');
  const { queryParams, setQueryParams } = useAllInferenceEndpointsState();

  const { paginatedSortedTableData, pagination, sorting } = useTableData(
    inferenceEndpoints,
    queryParams,
    searchKey
  );

  const tableColumns = useTableColumns();

  const handleTableChange = useCallback(
    ({ page, sort }) => {
      const newQueryParams = {
        ...queryParams,
        ...(sort && {
          sortField: sort.field,
          sortOrder: sort.direction,
        }),
        ...(page && {
          page: page.index + 1,
          perPage: page.size,
        }),
      };
      setQueryParams(newQueryParams);
    },
    [queryParams, setQueryParams]
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <TableSearch searchKey={searchKey} setSearchKey={setSearchKey} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EndpointsTable
          columns={tableColumns}
          data={paginatedSortedTableData}
          onChange={handleTableChange}
          pagination={pagination}
          sorting={sorting}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
