/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { EventFiltersListEmptyState } from './components/empty';
import { useEventFiltersNavigateCallback, useEventFiltersSelector } from './hooks';
import { EventFiltersFlyout } from './components/flyout';
import {
  getListFetchError,
  getListIsLoading,
  getListItems,
  getListPagination,
  getCurrentLocation,
} from '../store/selector';
import { PaginatedContent, PaginatedContentProps } from '../../../components/paginated_content';
import { ExceptionListItemSchema } from '../../../../../../lists/common';
import { Immutable, MaybeImmutable } from '../../../../../common/endpoint/types';

const TemporaryComponent = memo<{ item: MaybeImmutable<ExceptionListItemSchema> }>(({ item }) => {
  return (
    <div style={{ margin: '1em 0', border: '1px solid lightgrey' }}>{JSON.stringify(item)}</div>
  );
});
TemporaryComponent.displayName = 'TemporaryComponent';

type EventListPaginatedContent = PaginatedContentProps<
  Immutable<ExceptionListItemSchema>,
  typeof TemporaryComponent
>;

export const EventFiltersListPage = memo(() => {
  const listItems = useEventFiltersSelector(getListItems);
  const pagination = useEventFiltersSelector(getListPagination);
  const isLoading = useEventFiltersSelector(getListIsLoading);
  const fetchError = useEventFiltersSelector(getListFetchError);
  const location = useEventFiltersSelector(getCurrentLocation);
  const navigateCallback = useEventFiltersNavigateCallback();
  const showFlyout = !!location.show;

  const handleAddButtonClick = useCallback(
    () =>
      navigateCallback({
        show: 'create',
        id: undefined,
      }),
    [navigateCallback]
  );

  const handleCancelButtonClick = useCallback(
    () =>
      navigateCallback({
        show: undefined,
        id: undefined,
      }),
    [navigateCallback]
  );

  const handleItemComponentProps: EventListPaginatedContent['itemComponentProps'] = useCallback(
    (item) => ({ item }),
    []
  );

  const handlePaginatedContentChange: EventListPaginatedContent['onChange'] = useCallback(
    ({ pageIndex, pageSize }) => {
      navigateCallback({
        page_index: pageIndex,
        page_size: pageSize,
      });
    },
    [navigateCallback]
  );

  return (
    <AdministrationListPage
      beta={false}
      title={
        <FormattedMessage
          id="xpack.securitySolution.eventFilters.list.pageTitle"
          defaultMessage="Event Filters"
        />
      }
      subtitle={i18n.translate('xpack.securitySolution.eventFilters.aboutInfo', {
        defaultMessage:
          'Add an event filter to exclude high volume or unwanted events from being written to Elasticsearch. Event ' +
          'filters are processed by the Endpoint Security integration, and are applied to hosts running this integration on their agents.',
      })}
      actions={
        listItems.length && (
          <EuiButton
            fill
            iconType="plusInCircle"
            isDisabled={showFlyout}
            onClick={handleAddButtonClick}
            data-test-subj="eventFiltersPageAddButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.list.pageAddButton"
              defaultMessage="Add Endpoint Event Filter"
            />
          </EuiButton>
        )
      }
    >
      {showFlyout && <EventFiltersFlyout onCancel={handleCancelButtonClick} />}

      <PaginatedContent<Immutable<ExceptionListItemSchema>, typeof TemporaryComponent>
        items={listItems}
        ItemComponent={TemporaryComponent}
        itemComponentProps={handleItemComponentProps}
        onChange={handlePaginatedContentChange}
        error={fetchError?.message}
        loading={isLoading}
        pagination={pagination}
        noItemsMessage={
          <EventFiltersListEmptyState onAdd={handleAddButtonClick} isAddDisabled={showFlyout} />
        }
      />
    </AdministrationListPage>
  );
});

EventFiltersListPage.displayName = 'EventFiltersListPage';
