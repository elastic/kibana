/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect } from 'react';
import {
  EuiTablePagination,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiIcon,
  EuiBasicTableProps,
  EuiText,
} from '@elastic/eui';

import { TrustedApp } from '../../../../../../../common/endpoint/types';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../../../common/constants';

import {
  getCurrentLocationPageIndex,
  getCurrentLocationPageSize,
  getListErrorMessage,
  getListItems,
  getListTotalItemsCount,
  isListLoading,
} from '../../../store/selectors';

import {
  useTrustedAppsNavigateCallback,
  useTrustedAppsSelector,
  useTrustedAppsStoreActionCallback,
} from '../../hooks';

import { NO_RESULTS_MESSAGE } from '../../translations';

import { TrustedAppCard } from '../trusted_app_card';

export interface PaginationBarProps {
  pagination: EuiBasicTableProps<TrustedApp>['pagination'];
  onPageSizeChange: (pageSize: number) => void;
  onPageChange: (pageIndex: number) => void;
}

const PaginationBar = ({ pagination, onPageSizeChange, onPageChange }: PaginationBarProps) => {
  const pageCount = pagination ? Math.ceil(pagination.totalItemCount / pagination.pageSize) : 0;

  useEffect(() => {
    if (pagination && pageCount > 0 && pageCount < pagination.pageIndex + 1) {
      onPageChange(pageCount - 1);
    }
  }, [pageCount, onPageChange, pagination]);

  return (
    <div>
      <EuiTablePagination
        activePage={pagination?.pageIndex}
        hidePerPageOptions={pagination?.hidePerPageOptions}
        itemsPerPage={pagination?.pageSize}
        itemsPerPageOptions={pagination?.pageSizeOptions}
        pageCount={pageCount}
        onChangeItemsPerPage={onPageSizeChange}
        onChangePage={onPageChange}
      />
    </div>
  );
};

export const TrustedAppsGrid = memo(() => {
  const pageIndex = useTrustedAppsSelector(getCurrentLocationPageIndex);
  const pageSize = useTrustedAppsSelector(getCurrentLocationPageSize);
  const totalItemCount = useTrustedAppsSelector(getListTotalItemsCount);
  const listItems = useTrustedAppsSelector(getListItems);
  const isLoading = useTrustedAppsSelector(isListLoading);
  const error = useTrustedAppsSelector(getListErrorMessage);

  const handleTrustedAppDelete = useTrustedAppsStoreActionCallback((trustedApp) => ({
    type: 'trustedAppDeletionDialogStarted',
    payload: { entry: trustedApp },
  }));
  const handlePageSizeChange = useTrustedAppsNavigateCallback((newPageSize) => ({
    page_index: 0,
    page_size: newPageSize,
  }));
  const handlePageChange = useTrustedAppsNavigateCallback((newPageIndex) => ({
    page_index: newPageIndex,
  }));

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        {isLoading && <EuiProgress size="xs" color="primary" />}
      </EuiFlexItem>
      <EuiFlexItem>
        {error && (
          <div className="euiTextAlign--center">
            <EuiIcon type="minusInCircle" color="danger" /> {error}
          </div>
        )}
        {!error && (
          <EuiFlexGroup direction="column">
            {listItems.map((item) => (
              <EuiFlexItem grow={false} key={item.id}>
                <TrustedAppCard trustedApp={item} onDelete={handleTrustedAppDelete} />
              </EuiFlexItem>
            ))}
            {listItems.length === 0 && (
              <EuiText size="s" className="euiTextAlign--center">
                {NO_RESULTS_MESSAGE}
              </EuiText>
            )}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {!error && totalItemCount > 0 && (
          <PaginationBar
            pagination={{
              pageIndex,
              pageSize,
              totalItemCount,
              pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
            }}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={handlePageChange}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

TrustedAppsGrid.displayName = 'TrustedAppsGrid';
