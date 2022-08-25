/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiTablePagination } from '@elastic/eui';

import type { ExceptionsPagination } from '../../utils/types';
import * as i18n from './translations';

interface ExceptionsViewerPaginationProps {
  pagination: ExceptionsPagination;
  onPaginationChange: (arg: { page: number; perPage: number }) => void;
}

const ExceptionsViewerPaginationComponent = ({
  pagination,
  onPaginationChange,
}: ExceptionsViewerPaginationProps): JSX.Element => {
  const handleItemsPerPageChange = useCallback(
    (pageSize: number) => {
      onPaginationChange({
        page: pagination.pageIndex,
        perPage: pageSize,
      });
    },
    [onPaginationChange, pagination.pageIndex]
  );

  const handlePageIndexChange = useCallback(
    (pageIndex: number) => {
      onPaginationChange({
        page: pageIndex,
        perPage: pagination.pageSize,
      });
    },
    [onPaginationChange, pagination.pageSize]
  );

  return (
    <EuiTablePagination
      aria-label={i18n.EXCEPTION_ITEMS_PAGINATION_ARIA_LABEL}
      pageCount={Math.ceil(pagination.totalItemCount / pagination.pageSize)}
      activePage={pagination.pageIndex}
      onChangePage={handlePageIndexChange}
      itemsPerPage={pagination.pageSize}
      onChangeItemsPerPage={handleItemsPerPageChange}
      itemsPerPageOptions={pagination.pageSizeOptions}
      data-test-subj="allExceptionItemsPagination"
    />
  );
};

ExceptionsViewerPaginationComponent.displayName = 'ExceptionsViewerPaginationComponent';

export const ExceptionsViewerPagination = React.memo(ExceptionsViewerPaginationComponent);

ExceptionsViewerPagination.displayName = 'ExceptionsViewerPagination';
