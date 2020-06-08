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

  const closePerPageMenu = useCallback((): void => setIsOpen(false), [setIsOpen]);

  const onPerPageMenuClick = useCallback((): void => setIsOpen((isPopoverOpen) => !isPopoverOpen), [
    setIsOpen,
  ]);

  const onPageClick = useCallback(
    (pageIndex: number): void => {
      onPaginationChange({
        filter: {},
        pagination: {
          page: pageIndex + 1,
          perPage: pagination.pageSize,
          total: pagination.totalItemCount,
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
              page: pagination.pageIndex,
              perPage: rows,
              total: pagination.totalItemCount,
            },
          });
        }}
      >
        {i18n.NUMBER_OF_ITEMS(rows)}
      </EuiContextMenuItem>
    ));
  }, [pagination, onPaginationChange]);

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
              onClick={onPerPageMenuClick}
            >
              {i18n.ITEMS_PER_PAGE(pagination.pageSize)}
            </EuiButtonEmpty>
          }
          isOpen={isOpen}
          closePopover={closePerPageMenu}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel items={items} />
        </EuiPopover>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiPagination
          pageCount={totalPages}
          activePage={pagination.pageIndex}
          onPageClick={onPageClick}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ExceptionsViewerPaginationComponent.displayName = 'ExceptionsViewerPaginationComponent';

export const ExceptionsViewerPagination = React.memo(ExceptionsViewerPaginationComponent);

ExceptionsViewerPagination.displayName = 'ExceptionsViewerPagination';
