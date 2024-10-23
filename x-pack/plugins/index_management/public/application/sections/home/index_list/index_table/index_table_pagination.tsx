/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTablePagination } from '@elastic/eui';
import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';
import { IndexModule } from '../../../../../../common';

interface IndexTablePaginationProps {
  pager: any;
  pageChanged: any;
  pageSizeChanged: any;
  readURLParams: any;
  setURLParam: any;
}

export const PAGE_SIZE_OPTIONS = [10, 50, 100];

export const IndexTablePagination = ({
  pager,
  pageChanged,
  pageSizeChanged,
  readURLParams,
  setURLParam,
}: IndexTablePaginationProps) => {
  const { pageSize, onTableChange } = useEuiTablePersist<IndexModule>({
    tableId: 'indices',
    initialPageSize: pager.itemsPerPage,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  });

  const { pageSize: urlParamPageSize } = readURLParams();

  // Update local storage if there is a url param for page size
  if (PAGE_SIZE_OPTIONS.includes(urlParamPageSize) && urlParamPageSize !== pageSize) {
    onTableChange({ page: { size: urlParamPageSize, index: pager.getCurrentPageIndex() } });
  }

  if (pageSize !== pager.itemsPerPage) {
    pageSizeChanged(pageSize);
  }

  return (
    <EuiTablePagination
      activePage={pager.getCurrentPageIndex()}
      itemsPerPage={pager.itemsPerPage}
      itemsPerPageOptions={PAGE_SIZE_OPTIONS}
      pageCount={pager.getTotalPages()}
      onChangeItemsPerPage={(size) => {
        setURLParam('pageSize', size);
        pageSizeChanged(size);
        onTableChange({ page: { size, index: pager.getCurrentPageIndex() } });
      }}
      onChangePage={(pageIndex) => {
        setURLParam('pageIndex', pageIndex);
        pageChanged(pageIndex);
      }}
    />
  );
};
