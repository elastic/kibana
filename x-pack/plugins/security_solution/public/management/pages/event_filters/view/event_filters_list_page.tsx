/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { useHistory } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import styled from 'styled-components';

import { AppAction } from '../../../../common/store/actions';
import { getEventFiltersListPath } from '../../../common/routing';
import { AdministrationListPage as _AdministrationListPage } from '../../../components/administration_list_page';

import { EventFiltersListEmptyState } from './components/empty';
import { useEventFiltersNavigateCallback, useEventFiltersSelector } from './hooks';
import { EventFiltersFlyout } from './components/flyout';
import {
  getListFetchError,
  getListIsLoading,
  getListItems,
  getListPagination,
  getCurrentLocation,
  getListPageDoesDataExist,
  getActionError,
  getFormEntry,
} from '../store/selector';
import { PaginatedContent, PaginatedContentProps } from '../../../components/paginated_content';
import { ExceptionListItemSchema } from '../../../../../../lists/common';
import { Immutable } from '../../../../../common/endpoint/types';
import {
  ExceptionItem,
  ExceptionItemProps,
} from '../../../../common/components/exceptions/viewer/exception_item';

type EventListPaginatedContent = PaginatedContentProps<
  Immutable<ExceptionListItemSchema>,
  typeof ExceptionItem
>;

const AdministrationListPage = styled(_AdministrationListPage)`
  .event-filter-container > * {
    margin-bottom: ${({ theme }) => theme.eui.spacerSizes.l};

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

export const EventFiltersListPage = memo(() => {
  const history = useHistory();
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const isActionError = useEventFiltersSelector(getActionError);
  const formEntry = useEventFiltersSelector(getFormEntry);
  const listItems = useEventFiltersSelector(getListItems);
  const pagination = useEventFiltersSelector(getListPagination);
  const isLoading = useEventFiltersSelector(getListIsLoading);
  const fetchError = useEventFiltersSelector(getListFetchError);
  const location = useEventFiltersSelector(getCurrentLocation);
  const doesDataExist = useEventFiltersSelector(getListPageDoesDataExist);

  const navigateCallback = useEventFiltersNavigateCallback();
  const showFlyout = !!location.show;

  // Clean url params if wrong
  useEffect(() => {
    if ((location.show === 'edit' && !location.id) || (location.show === 'create' && !!location.id))
      navigateCallback({
        show: 'create',
        id: undefined,
      });
  }, [location, navigateCallback]);

  // Catch fetch error -> actionError + empty entry in form
  useEffect(() => {
    if (isActionError && !formEntry) {
      // Replace the current URL route so that user does not keep hitting this page via browser back/fwd buttons
      history.replace(
        getEventFiltersListPath({
          ...location,
          show: undefined,
          id: undefined,
        })
      );
      dispatch({
        type: 'eventFiltersFormStateChanged',
        payload: {
          type: 'UninitialisedResourceState',
        },
      });
    }
  }, [dispatch, formEntry, history, isActionError, location, navigateCallback]);

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

  const handleItemEdit: ExceptionItemProps['onEditException'] = useCallback(
    (item: ExceptionListItemSchema) => {
      navigateCallback({
        show: 'edit',
        id: item.id,
      });
    },
    [navigateCallback]
  );

  const handleItemDelete: ExceptionItemProps['onDeleteException'] = useCallback((args) => {
    // TODO: implement delete item
  }, []);

  const handleItemComponentProps: EventListPaginatedContent['itemComponentProps'] = useCallback(
    (exceptionItem) => ({
      exceptionItem: exceptionItem as ExceptionListItemSchema,
      loadingItemIds: [],
      commentsAccordionId: '',
      onEditException: handleItemEdit,
      onDeleteException: handleItemDelete,
      showModified: true,
      showName: true,
    }),
    [handleItemDelete, handleItemEdit]
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
        doesDataExist && (
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
      {showFlyout && (
        <EventFiltersFlyout
          onCancel={handleCancelButtonClick}
          id={location.id}
          type={location.show}
        />
      )}

      <PaginatedContent<Immutable<ExceptionListItemSchema>, typeof ExceptionItem>
        items={listItems}
        ItemComponent={ExceptionItem}
        itemComponentProps={handleItemComponentProps}
        onChange={handlePaginatedContentChange}
        error={fetchError?.message}
        loading={isLoading}
        pagination={pagination}
        contentClassName="event-filter-container"
        noItemsMessage={
          !doesDataExist && (
            <EventFiltersListEmptyState onAdd={handleAddButtonClick} isAddDisabled={showFlyout} />
          )
        }
      />
    </AdministrationListPage>
  );
});

EventFiltersListPage.displayName = 'EventFiltersListPage';
