/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiTablePagination } from '@elastic/eui';
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  useEuiTablePersistingPageSize,
} from '@kbn/shared-ux-table-pagination';

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
  const { getPersistingPageSize, setPersistingPageSize } = useEuiTablePersistingPageSize('indices');
  const [pageSize, setPageSize] = useState(getPersistingPageSize());

  if (pager.itemsPerPage !== pageSize) {
    pageSizeChanged(pageSize);
  }

  const { pageSize: urlParamPageSize } = readURLParams();

  if (
    urlParamPageSize !== undefined &&
    urlParamPageSize !== pageSize &&
    DEFAULT_PAGE_SIZE_OPTIONS.includes(urlParamPageSize)
  ) {
    setPersistingPageSize(urlParamPageSize);
    setPageSize(urlParamPageSize);
  }

  return (
    <EuiTablePagination
      activePage={pager.getCurrentPageIndex()}
      itemsPerPage={pageSize}
      itemsPerPageOptions={DEFAULT_PAGE_SIZE_OPTIONS}
      pageCount={pager.getTotalPages()}
      onChangeItemsPerPage={(newPageSize) => {
        setPersistingPageSize(newPageSize);
        setURLParam('pageSize', pageSize);
        pageSizeChanged(newPageSize);
        setPageSize(newPageSize);
      }}
      onChangePage={(pageIndex) => {
        setURLParam('pageIndex', pageIndex);
        pageChanged(pageIndex);
      }}
    />
  );
};
