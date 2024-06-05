/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';

import { useTableData } from '../../hooks/use_table_data';

import { useAllInferenceEndpointsState } from '../../hooks/use_all_inference_endpoints_state';
import { EndpointsTable } from './endpoints_table';
import { TABLE_COLUMNS } from './table_columns';

interface TabularPageProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
}

export const TabularPage: React.FC<TabularPageProps> = ({ inferenceEndpoints }) => {
  const { queryParams, setQueryParams } = useAllInferenceEndpointsState();

  const { paginatedSortedTableData, pagination, sorting } = useTableData(
    inferenceEndpoints,
    queryParams
  );

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
    <EndpointsTable
      columns={TABLE_COLUMNS}
      data={paginatedSortedTableData}
      onChange={handleTableChange}
      pagination={pagination}
      sorting={sorting}
    />
  );
};
