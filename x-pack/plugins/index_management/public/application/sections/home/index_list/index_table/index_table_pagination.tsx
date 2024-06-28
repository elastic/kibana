/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTablePagination } from '@elastic/eui';
import { DEFAULT_PAGE_SIZE_OPTIONS, useEuiTablePersist } from '@kbn/shared-ux-table-persist';

interface IndexTablePaginationProps {
  pager: any;
  pageChanged: any;
  pageSizeChanged: any;
  readURLParams: any;
  setURLParam: any;
}

export const IndexTablePagination = ({
  pager,
  pageChanged,
  pageSizeChanged,
  readURLParams,
  setURLParam,
}: IndexTablePaginationProps) => {
  const { pageSize, onTableChange } = useEuiTablePersist({
    tableId: 'componentTemplates',
    customOnTableChange: ({ page }) => {
      setURLParam('pageSize', page?.size);
      pageSizeChanged(page?.size);
    },
  });

  if (pager.itemsPerPage !== pageSize) {
    pageSizeChanged(pageSize);
  }

  const { pageSize: urlParamPageSize } = readURLParams();

  if (
    urlParamPageSize !== undefined &&
    urlParamPageSize !== pageSize &&
    DEFAULT_PAGE_SIZE_OPTIONS.includes(urlParamPageSize)
  ) {
    pageSizeChanged(urlParamPageSize);
    onTableChange({ page: { size: urlParamPageSize, index: pager.getCurrentPageIndex() } });
  }

  return (
    <EuiTablePagination
      activePage={pager.getCurrentPageIndex()}
      itemsPerPage={pageSize}
      itemsPerPageOptions={DEFAULT_PAGE_SIZE_OPTIONS}
      pageCount={pager.getTotalPages()}
      onChangeItemsPerPage={(size) =>
        onTableChange({ page: { size, index: pager.getCurrentPageIndex() } })
      }
      onChangePage={(pageIndex) => {
        setURLParam('pageIndex', pageIndex);
        pageChanged(pageIndex);
      }}
    />
  );
};
