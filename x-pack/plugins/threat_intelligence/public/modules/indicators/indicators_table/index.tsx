/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC, useState, useCallback } from 'react';
import { EuiDataGrid } from '@elastic/eui';
import { Indicator } from '../../../../common/types/indicator';

const columns = [
  {
    id: 'value',
    displayAsText: 'Indicator',
  },
  {
    id: 'type',
    displayAsText: 'Indicator type',
  },
  {
    id: 'feed',
    displayAsText: 'Feed',
  },
];

const renderCellValue = (indicators: Indicator[]) => {
  return ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
    const indicator = indicators[rowIndex];
    if (columnId === 'value') {
      return indicator.value;
    }
    if (columnId === 'type') {
      return indicator.type;
    }
    if (columnId === 'feed') {
      return indicator.feed;
    }
    return null;
  };
};

export const IndicatorsTable: VFC<{ indicators: Indicator[] }> = ({ indicators }) => {
  const [visibleColumns, setVisibleColumns] = useState(columns.map((column) => column.id));
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination((currentPagination) => ({
        ...currentPagination,
        pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex) => setPagination((currentPagination) => ({ ...currentPagination, pageIndex })),
    [setPagination]
  );

  return (
    <EuiDataGrid
      aria-labelledby={'indicators-table'}
      columns={columns}
      columnVisibility={{ visibleColumns, setVisibleColumns }}
      rowCount={indicators.length}
      renderCellValue={renderCellValue(indicators)}
      toolbarVisibility={{
        showDisplaySelector: false,
        showFullScreenSelector: false,
      }}
      pagination={{
        ...pagination,
        pageSizeOptions: [10, 25, 50],
        onChangeItemsPerPage,
        onChangePage,
      }}
      gridStyle={{
        border: 'horizontal',
        header: 'underline',
        cellPadding: 'm',
        fontSize: 's',
      }}
    />
  );
};
