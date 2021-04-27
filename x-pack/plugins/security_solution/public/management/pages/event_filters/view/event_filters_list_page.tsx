/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { useEventFiltersSelector } from './hooks';
import { getListIsLoading, getListItems, getListPagination } from '../store/selector';
import { PaginatedContent, PaginatedContentProps } from '../../../components/paginated_content';
import { ExceptionListItemSchema } from '../../../../../../lists/common';
import { EventFiltersEmptyState } from './components/event_list_empty_state';

const TemporaryComponent = memo(() => {
  return <div>{Math.random()}</div>;
});
TemporaryComponent.displayName = 'TemporaryComponent';
type EventListPaginatedContent = PaginatedContentProps<
  ExceptionListItemSchema,
  typeof TemporaryComponent
>;

export const EventFiltersListPage = memo(() => {
  // const dispatch = useDispatch<Dispatch<AppAction>>();
  const listItems = useEventFiltersSelector(getListItems);
  const pagination = useEventFiltersSelector(getListPagination);
  const isLoading = useEventFiltersSelector(getListIsLoading);

  const handleItemComponentProps: EventListPaginatedContent['itemComponentProps'] = useCallback(() => {}, []);

  const handlePaginatedContentChange: EventListPaginatedContent['onChange'] = useCallback(() => {}, []);

  const noItemsMessage = useMemo(() => {
    if (pagination.totalItemCount === 0) {
      // FIXME: plugin in create process
      return <EventFiltersEmptyState onAdd={() => {}} isAddDisabled={false} />;
    }
  }, [pagination.totalItemCount]);

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
    >
      <PaginatedContent
        items={listItems}
        ItemComponent={TemporaryComponent}
        itemComponentProps={handleItemComponentProps}
        onChange={handlePaginatedContentChange}
        loading={isLoading}
        pagination={pagination}
        noItemsMessage={noItemsMessage}
      />
    </AdministrationListPage>
  );
});

EventFiltersListPage.displayName = 'EventFiltersListPage';
