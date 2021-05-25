/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';

import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
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

import { TrustedAppCard, TrustedAppCardProps } from '../trusted_app_card';
import { getTrustedAppsListPath } from '../../../../../common/routing';
import {
  PaginatedContent,
  PaginatedContentProps,
} from '../../../../../components/paginated_content';
import { TrustedApp } from '../../../../../../../common/endpoint/types';

export interface PaginationBarProps {
  pagination: Pagination;
  onChange: (pagination: { size: number; index: number }) => void;
}

type TrustedAppCardType = typeof TrustedAppCard;

const RootWrapper = styled.div`
  .trusted-app + .trusted-app {
    margin-top: ${({ theme }) => theme.eui.spacerSizes.l};
  }
`;

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

  const handlePaginationChange: PaginatedContentProps<
    TrustedApp,
    TrustedAppCardType
  >['onChange'] = useTrustedAppsNavigateCallback(({ pageIndex, pageSize }) => ({
    page_index: pageIndex,
    page_size: pageSize,
  }));

  return (
    <RootWrapper>
      <PaginatedContent<TrustedApp, TrustedAppCardType>
        items={listItems as TrustedApp[]}
        onChange={handlePaginationChange}
        ItemComponent={TrustedAppCard}
        itemComponentProps={(ta) => ({
          trustedApp: ta,
          onDelete: handleTrustedAppDelete,
          onEdit: handleTrustedAppEdit,
          className: 'trusted-app',
        })}
        loading={isLoading}
        itemId="id"
        error={error}
        pagination={pagination}
      />
    </RootWrapper>
  );
});

TrustedAppsGrid.displayName = 'TrustedAppsGrid';
