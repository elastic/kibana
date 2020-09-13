/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiBasicTable, EuiSpacer } from '@elastic/eui';
import { Pagination } from '@elastic/eui/src/components/basic_table/pagination_bar';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useFetcher } from '../../../../hooks/useFetcher';

export function JSErrors() {
  const { urlParams, uiFilters } = useUrlParams();

  const { start, end, serviceName } = urlParams;

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceName) {
        return callApmApi({
          pathname: '/api/apm/rum-client/js-errors',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify(uiFilters),
              pageSize: String(pagination.pageSize),
              pageIndex: String(pagination.pageIndex),
            },
          },
        });
      }
      return Promise.resolve(null);
    },
    [start, end, serviceName, uiFilters, pagination]
  );

  const cols = [
    {
      field: 'errorMessage',
      name: 'Error message',
      truncateText: true,
    },
    {
      name: 'Impacted page loads',
      field: 'count',
      align: 'right' as const,
    },
  ];

  const onTableChange = ({ page }: Pagination) => {
    setPagination({
      ...page,
    });
  };

  return (
    <>
      <EuiSpacer size="s" />
      <EuiBasicTable
        loading={status !== 'success'}
        responsive={false}
        compressed={true}
        columns={cols}
        items={data?.items ?? []}
        onChange={onTableChange}
        pagination={{
          ...pagination,
          totalItemCount: data?.total ?? 0,
        }}
      />
    </>
  );
}
