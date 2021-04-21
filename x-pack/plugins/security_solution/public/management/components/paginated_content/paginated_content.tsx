/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren, ReactNode, useCallback, useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiProgress,
  EuiTablePagination,
  EuiTablePaginationProps,
  Pagination,
} from '@elastic/eui';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n/react';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

export type PaginatedContentProps = PropsWithChildren<{
  onChange: (changes: { pageIndex: number; pageSize: number }) => void;
  loading?: boolean;
  pagination?: Pagination;
  noItemsMessage?: ReactNode;
  'data-test-subj'?: string;
  /** Classname applied to the area that holds the content items */
  contentClassName?: string;
}>;

const RootContainer = styled.div`
  position: relative;

  .body {
    min-height: ${({ theme }) => theme.eui.gutterTypes.gutterExtraLarge};
  }
`;

const DefaultNoItemsFound = memo(() => {
  return (
    <EuiEmptyPrompt
      title={
        <FormattedMessage
          id="xpack.securitySolution.endpoint.paginatedContent.noItemsFoundTitle"
          defaultMessage="No items found"
        />
      }
    />
  );
});

DefaultNoItemsFound.displayName = 'DefaultNoItemsFound';

/**
 * A generic component to display paginated content. Provides "Items per Page" as well as pagination
 * controls similar to the BasicTable of EUI. The props supported by this component (for the most part)
 * support those that BasicTable accept.
 */
export const PaginatedContent = memo<PaginatedContentProps>(
  ({
    pagination,
    onChange,
    loading,
    noItemsMessage,
    contentClassName,
    'data-test-subj': dataTestSubj,
    children,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    const pageCount = useMemo(
      () => Math.ceil((pagination?.totalItemCount || 1) / (pagination?.pageSize || 1)),
      [pagination?.pageSize, pagination?.totalItemCount]
    );

    const handleItemsPerPageChange: EuiTablePaginationProps['onChangeItemsPerPage'] = useCallback(
      (pageSize) => {
        onChange({ pageSize, pageIndex: pagination?.pageIndex || 0 });
      },
      [onChange, pagination?.pageIndex]
    );

    const handlePageChange: EuiTablePaginationProps['onChangePage'] = useCallback(
      (pageIndex) => {
        onChange({ pageIndex, pageSize: pagination?.pageSize || 10 });
      },
      [onChange, pagination?.pageSize]
    );

    return (
      <RootContainer data-test-subj={dataTestSubj}>
        {loading && <EuiProgress size="xs" color="primary" />}

        <div className="body" data-test-subj={getTestId('body')}>
          {!children && (noItemsMessage || <DefaultNoItemsFound />)}
          {children && <div className={contentClassName}>{children}</div>}
        </div>

        {pagination && (
          <div>
            <EuiTablePagination
              activePage={pagination.pageIndex}
              itemsPerPage={pagination.pageSize}
              itemsPerPageOptions={pagination.pageSizeOptions}
              pageCount={pageCount}
              hidePerPageOptions={pagination.hidePerPageOptions}
              onChangeItemsPerPage={handleItemsPerPageChange}
              onChangePage={handlePageChange}
            />
          </div>
        )}
      </RootContainer>
    );
  }
);

PaginatedContent.displayName = 'PaginatedContent';
