/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactElement, useCallback, useState, useMemo } from 'react';
import {
  EuiContextMenuItem,
  EuiButtonEmpty,
  EuiPagination,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPopover,
  EuiContextMenuPanel,
} from '@elastic/eui';

import * as i18n from '../translations';
import { ExceptionsPagination, Filter } from '../types';

interface ExceptionsViewerPaginationProps {
  pagination: ExceptionsPagination;
  onPaginationChange: (arg: Filter) => void;
}

const ExceptionsViewerPaginationComponent = ({
  pagination,
  onPaginationChange,
}: ExceptionsViewerPaginationProps): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClosePerPageMenu = useCallback((): void => setIsOpen(false), [setIsOpen]);

  const handlePerPageMenuClick = useCallback(
    (): void => setIsOpen((isPopoverOpen) => !isPopoverOpen),
    [setIsOpen]
  );

  const handlePageClick = useCallback(
    (pageIndex: number): void => {
      onPaginationChange({
        filter: {},
        pagination: {
          pageIndex: pageIndex + 1,
          pageSize: pagination.pageSize,
          totalItemCount: pagination.totalItemCount,
        },
      });
    },
    [pagination, onPaginationChange]
  );

  const items = useMemo((): ReactElement[] => {
    return pagination.pageSizeOptions.map((rows) => (
      <EuiContextMenuItem
        key={rows}
        icon="empty"
        onClick={() => {
          onPaginationChange({
            filter: {},
            pagination: {
              pageIndex: pagination.pageIndex,
              pageSize: rows,
              totalItemCount: pagination.totalItemCount,
            },
          });
          handleClosePerPageMenu();
        }}
        data-test-subj="exceptionsPerPageItem"
      >
        {i18n.NUMBER_OF_ITEMS(rows)}
      </EuiContextMenuItem>
    ));
  }, [pagination, onPaginationChange, handleClosePerPageMenu]);

  const totalPages = useMemo((): number => {
    if (pagination.totalItemCount > 0) {
      return Math.ceil(pagination.totalItemCount / pagination.pageSize);
    } else {
      return 1;
    }
  }, [pagination]);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonEmpty
              size="s"
              color="text"
              iconType="arrowDown"
              iconSide="right"
              onClick={handlePerPageMenuClick}
              data-test-subj="exceptionsPerPageBtn"
            >
              {i18n.ITEMS_PER_PAGE(pagination.pageSize)}
            </EuiButtonEmpty>
          }
          isOpen={isOpen}
          closePopover={handleClosePerPageMenu}
          panelPaddingSize="none"
          repositionOnScroll
        >
          <EuiContextMenuPanel items={items} />
        </EuiPopover>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPagination
          pageCount={totalPages}
          activePage={pagination.pageIndex}
          onPageClick={handlePageClick}
          data-test-subj="exceptionsPagination"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ExceptionsViewerPaginationComponent.displayName = 'ExceptionsViewerPaginationComponent';

export const ExceptionsViewerPagination = React.memo(ExceptionsViewerPaginationComponent);

ExceptionsViewerPagination.displayName = 'ExceptionsViewerPagination';
