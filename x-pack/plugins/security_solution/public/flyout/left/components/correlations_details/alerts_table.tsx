/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo, useCallback } from 'react';
import { type Criteria, EuiBasicTable, formatDate } from '@elastic/eui';

import { usePaginatedAlerts } from './use_paginated_alerts';

export const TIMESTAMP_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

export const columns = [
  {
    field: '@timestamp',
    name: 'Timestamp',
    truncateText: true,
    dataType: 'date',
    render: (value: string) => formatDate(value, TIMESTAMP_DATE_FORMAT),
  },
  {
    field: 'kibana.alert.rule.name',
    name: 'Rule',
    truncateText: true,
  },
  {
    field: 'kibana.alert.reason',
    name: 'Reason',
    truncateText: true,
  },
  {
    field: 'kibana.alert.severity',
    name: 'Severity',
    truncateText: true,
  },
];

export interface AlertsTableProps {
  alertIds: string[];
}

export const AlertsTable: FC<AlertsTableProps> = ({ alertIds }) => {
  const { setPagination, setSorting, data, loading, paginationConfig, sorting, error } =
    usePaginatedAlerts(alertIds);

  const onTableChange = useCallback(
    ({ page, sort }: Criteria<Record<string, unknown>>) => {
      if (page) {
        const { index: pageIndex, size: pageSize } = page;
        setPagination({ pageIndex, pageSize });
      }

      if (sort) {
        setSorting(sort);
      }
    },
    [setPagination, setSorting]
  );

  const mappedData = useMemo(() => {
    return data
      .map((hit) => hit.fields)
      .map((fields = {}) =>
        Object.keys(fields).reduce((result, fieldName) => {
          result[fieldName] = fields?.[fieldName]?.[0] || fields?.[fieldName];
          return result;
        }, {} as Record<string, unknown>)
      );
  }, [data]);

  if (error) {
    return <div>{'handle errors'}</div>;
  }

  return (
    <EuiBasicTable
      loading={loading}
      tableCaption="Demo for EuiBasicTable with sorting"
      items={mappedData}
      columns={columns}
      pagination={paginationConfig}
      sorting={sorting}
      onChange={onTableChange}
    />
  );
};
