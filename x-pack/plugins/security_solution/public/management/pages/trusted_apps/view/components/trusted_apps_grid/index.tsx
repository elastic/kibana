/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useCallback, useEffect } from 'react';
import {
  EuiTablePagination,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiIcon,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { useHistory } from 'react-router-dom';
import { Pagination } from '../../../state';

import {
  getCurrentLocation,
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

import { TrustedAppCard, TrustedAppCardProps } from '../trusted_app_card';
import { getTrustedAppsListPath } from '../../../../../common/routing';

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

const GridMessage: FC = ({ children }) => (
  <div className="euiTextAlign--center">
    <EuiSpacer size="m" />
    {children}
    <EuiSpacer size="m" />
  </div>
);

export const TrustedAppsGrid = memo(() => {
  const history = useHistory();
  const pagination = useTrustedAppsSelector(getListPagination);
  const listItems = useTrustedAppsSelector(getListItems);
  const isLoading = useTrustedAppsSelector(isListLoading);
  const error = useTrustedAppsSelector(getListErrorMessage);
  const location = useTrustedAppsSelector(getCurrentLocation);

  const handleTrustedAppDelete = useTrustedAppsStoreActionCallback((trustedApp) => ({
    type: 'trustedAppDeletionDialogStarted',
    payload: { entry: trustedApp },
  }));

  const handleTrustedAppEdit: TrustedAppCardProps['onEdit'] = useCallback(
    (trustedApp) => {
      history.push(
        getTrustedAppsListPath({
          ...location,
          show: 'edit',
          id: trustedApp.id,
        })
      );
    },
    [history, location]
  );

  const handlePaginationChange = useTrustedAppsNavigateCallback(({ index, size }) => ({
    page_index: index,
    page_size: size,
  }));

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {isLoading && (
        <EuiFlexItem grow={false}>
          <EuiProgress size="xs" color="primary" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {error && (
          <GridMessage>
            <EuiIcon type="minusInCircle" color="danger" /> {error}
          </GridMessage>
        )}
        {!error && listItems.length === 0 && (
          <GridMessage>
            <EuiText size="s">{NO_RESULTS_MESSAGE}</EuiText>
          </GridMessage>
        )}
        {!error && listItems.length > 0 && (
          <>
            <EuiSpacer size="l" />

            <EuiFlexGroup direction="column">
              {listItems.map((item) => (
                <EuiFlexItem grow={false} key={item.id}>
                  <TrustedAppCard
                    trustedApp={item}
                    onDelete={handleTrustedAppDelete}
                    onEdit={handleTrustedAppEdit}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </EuiFlexItem>
      {!error && pagination.totalItemCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiSpacer size="l" />

          <PaginationBar pagination={pagination} onChange={handlePaginationChange} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

TrustedAppsGrid.displayName = 'TrustedAppsGrid';
