/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';
import { useHistory, useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
import styled from 'styled-components';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
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
  showDeleteModal,
  getTotalCountListItems,
} from '../store/selector';
import { PaginatedContent, PaginatedContentProps } from '../../../components/paginated_content';
import { Immutable, ListPageRouteState } from '../../../../../common/endpoint/types';
import { ExceptionItem } from '../../../../common/components/exceptions/viewer/exception_item';
import {
  AnyArtifact,
  ArtifactEntryCard,
  ArtifactEntryCardProps,
} from '../../../components/artifact_entry_card';
import { EventFilterDeleteModal } from './components/event_filter_delete_modal';

import { SearchExceptions } from '../../../components/search_exceptions';
import { BackToExternalAppButton } from '../../../components/back_to_external_app_button';
import { ABOUT_EVENT_FILTERS } from './translations';

type ArtifactEntryCardType = typeof ArtifactEntryCard;

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

const EDIT_EVENT_FILTER_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.eventFilters.list.cardAction.edit',
  {
    defaultMessage: 'Edit event filter',
  }
);

const DELETE_EVENT_FILTER_ACTION_LABEL = i18n.translate(
  'xpack.securitySolution.eventFilters.list.cardAction.delete',
  {
    defaultMessage: 'Delete event filter',
  }
);

export const EventFiltersListPage = memo(() => {
  const { state: routeState } = useLocation<ListPageRouteState | undefined>();
  const history = useHistory();
  const dispatch = useDispatch<Dispatch<AppAction>>();
  const isActionError = useEventFiltersSelector(getActionError);
  const formEntry = useEventFiltersSelector(getFormEntry);
  const listItems = useEventFiltersSelector(getListItems);
  const totalCountListItems = useEventFiltersSelector(getTotalCountListItems);
  const pagination = useEventFiltersSelector(getListPagination);
  const isLoading = useEventFiltersSelector(getListIsLoading);
  const fetchError = useEventFiltersSelector(getListFetchError);
  const location = useEventFiltersSelector(getCurrentLocation);
  const doesDataExist = useEventFiltersSelector(getListPageDoesDataExist);
  const showDelete = useEventFiltersSelector(showDeleteModal);

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

  const backButton = useMemo(() => {
    if (routeState && routeState.onBackButtonNavigateTo) {
      return <BackToExternalAppButton {...routeState} />;
    }
    return null;
  }, [routeState]);

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

  const handlePaginatedContentChange: EventListPaginatedContent['onChange'] = useCallback(
    ({ pageIndex, pageSize }) => {
      navigateCallback({
        page_index: pageIndex,
        page_size: pageSize,
      });
    },
    [navigateCallback]
  );

  const handleOnSearch = useCallback(
    (query: string) => {
      dispatch({ type: 'eventFiltersForceRefresh', payload: { forceRefresh: true } });
      navigateCallback({ filter: query });
    },
    [navigateCallback, dispatch]
  );

  const artifactCardPropsPerItem = useMemo(() => {
    const cachedCardProps: Record<string, ArtifactEntryCardProps> = {};

    // Casting `listItems` below to remove the `Immutable<>` from it in order to prevent errors
    // with common component's props
    for (const eventFilter of listItems as ExceptionListItemSchema[]) {
      let policies: ArtifactEntryCardProps['policies'];

      cachedCardProps[eventFilter.id] = {
        item: eventFilter as AnyArtifact,
        policies,
        hideDescription: true,
        'data-test-subj': 'eventFilterCard',
        actions: [
          {
            icon: 'controlsHorizontal',
            onClick: () => {
              history.push(
                getEventFiltersListPath({
                  ...location,
                  show: 'edit',
                  id: eventFilter.id,
                })
              );
            },
            'data-test-subj': 'editEventFilterAction',
            children: EDIT_EVENT_FILTER_ACTION_LABEL,
          },
          {
            icon: 'trash',
            onClick: () => {
              dispatch({
                type: 'eventFilterForDeletion',
                payload: eventFilter,
              });
            },
            'data-test-subj': 'deleteEventFilterAction',
            children: DELETE_EVENT_FILTER_ACTION_LABEL,
          },
        ],
      };
    }

    return cachedCardProps;
  }, [dispatch, history, listItems, location]);

  const handleArtifactCardProps = useCallback(
    (eventFilter: ExceptionListItemSchema) => {
      return artifactCardPropsPerItem[eventFilter.id];
    },
    [artifactCardPropsPerItem]
  );

  return (
    <AdministrationListPage
      headerBackComponent={backButton}
      title={
        <FormattedMessage
          id="xpack.securitySolution.eventFilters.list.pageTitle"
          defaultMessage="Event filters"
        />
      }
      subtitle={ABOUT_EVENT_FILTERS}
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
              defaultMessage="Add event filter"
            />
          </EuiButton>
        )
      }
      hideHeader={!doesDataExist}
    >
      {showFlyout && (
        <EventFiltersFlyout
          onCancel={handleCancelButtonClick}
          id={location.id}
          type={location.show}
        />
      )}

      {showDelete && <EventFilterDeleteModal />}

      {doesDataExist && (
        <>
          <SearchExceptions
            defaultValue={location.filter}
            onSearch={handleOnSearch}
            placeholder={i18n.translate('xpack.securitySolution.eventFilter.search.placeholder', {
              defaultMessage: 'Search on the fields below: name, comments, value',
            })}
          />
          <EuiSpacer size="m" />
          <EuiText color="subdued" size="xs" data-test-subj="eventFiltersCountLabel">
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.list.totalCount"
              defaultMessage="Showing {total, plural, one {# event filter} other {# event filters}}"
              values={{ total: totalCountListItems }}
            />
          </EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      <PaginatedContent<ExceptionListItemSchema, ArtifactEntryCardType>
        items={listItems}
        ItemComponent={ArtifactEntryCard}
        itemComponentProps={handleArtifactCardProps}
        onChange={handlePaginatedContentChange}
        error={fetchError?.message}
        loading={isLoading}
        pagination={pagination}
        contentClassName="event-filter-container"
        data-test-subj="eventFiltersContent"
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
