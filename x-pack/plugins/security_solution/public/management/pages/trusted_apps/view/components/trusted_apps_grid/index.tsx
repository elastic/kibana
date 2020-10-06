/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
  EuiTablePagination,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiIcon,
  EuiText,
} from '@elastic/eui';

import { Pagination } from '../../../state';

import {
  getListErrorMessage,
  getListItems,
  getListPagination,
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
  pagination: Pagination;
  onChange: (pagination: { size: number; index: number }) => void;
}

const PaginationBar = ({ pagination, onChange }: PaginationBarProps) => {
  const pageCount = Math.ceil(pagination.totalItemCount / pagination.pageSize);

  useEffect(() => {
    if (pageCount > 0 && pageCount < pagination.pageIndex + 1) {
      onChange({ index: pageCount - 1, size: pagination.pageSize });
    }
  }, [pageCount, onChange, pagination]);

  return (
    <div>
      <EuiTablePagination
        activePage={pagination.pageIndex}
        itemsPerPage={pagination.pageSize}
        itemsPerPageOptions={pagination.pageSizeOptions}
        pageCount={pageCount}
        onChangeItemsPerPage={useCallback((size) => onChange({ index: 0, size }), [onChange])}
        onChangePage={useCallback((index) => onChange({ index, size: pagination.pageSize }), [
          pagination.pageSize,
          onChange,
        ])}
      />
    </div>
  );
};

export const TrustedAppsGrid = memo(() => {
  const pagination = useTrustedAppsSelector(getListPagination);
  const listItems = useTrustedAppsSelector(getListItems);
  const isLoading = useTrustedAppsSelector(isListLoading);
  const error = useTrustedAppsSelector(getListErrorMessage);

  const handleTrustedAppDelete = useTrustedAppsStoreActionCallback((trustedApp) => ({
    type: 'trustedAppDeletionDialogStarted',
    payload: { entry: trustedApp },
  }));
  const handlePaginationChange = useTrustedAppsNavigateCallback(({ index, size }) => ({
    page_index: index,
    page_size: size,
  }));

  return (
    <EuiFlexGroup direction="column">
      {isLoading && (
        <EuiFlexItem grow={false}>
          <EuiProgress size="xs" color="primary" />
        </EuiFlexItem>
      )}
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
      {!error && pagination.totalItemCount > 0 && (
        <EuiFlexItem grow={false}>
          <PaginationBar pagination={pagination} onChange={handlePaginationChange} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

TrustedAppsGrid.displayName = 'TrustedAppsGrid';
