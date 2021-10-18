/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { i18n } from '@kbn/i18n';
import React, { Dispatch, useCallback, useEffect } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { ExceptionItem } from '../../../../common/components/exceptions/viewer/exception_item';
import { useLicense } from '../../../../common/hooks/use_license';
import {
  getCurrentLocation,
  getItemToDelete,
  getListFetchError,
  getListIsLoading,
  getListItems,
  getListPagination,
} from '../store/selector';
import {
  useHostIsolationExceptionsNavigateCallback,
  useHostIsolationExceptionsSelector,
} from './hooks';
import { PaginatedContent, PaginatedContentProps } from '../../../components/paginated_content';
import { Immutable } from '../../../../../common/endpoint/types';
import { AdministrationListPage } from '../../../components/administration_list_page';
import { SearchExceptions } from '../../../components/search_exceptions';
import { ArtifactEntryCard, ArtifactEntryCardProps } from '../../../components/artifact_entry_card';
import { HostIsolationExceptionsEmptyState } from './components/empty';
import { HostIsolationExceptionsPageAction } from '../store/action';
import { HostIsolationExceptionDeleteModal } from './components/delete_modal';
import { HostIsolationExceptionsFormFlyout } from './components/form_flyout';
import {
  DELETE_HOST_ISOLATION_EXCEPTION_LABEL,
  EDIT_HOST_ISOLATION_EXCEPTION_LABEL,
} from './components/translations';
import { getEndpointListPath } from '../../../common/routing';

type HostIsolationExceptionPaginatedContent = PaginatedContentProps<
  Immutable<ExceptionListItemSchema>,
  typeof ExceptionItem
>;

export const HostIsolationExceptionsList = () => {
  const listItems = useHostIsolationExceptionsSelector(getListItems);
  const pagination = useHostIsolationExceptionsSelector(getListPagination);
  const isLoading = useHostIsolationExceptionsSelector(getListIsLoading);
  const fetchError = useHostIsolationExceptionsSelector(getListFetchError);
  const location = useHostIsolationExceptionsSelector(getCurrentLocation);
  const dispatch = useDispatch<Dispatch<HostIsolationExceptionsPageAction>>();
  const itemToDelete = useHostIsolationExceptionsSelector(getItemToDelete);
  const navigateCallback = useHostIsolationExceptionsNavigateCallback();
  const history = useHistory();
  const license = useLicense();
  const showFlyout = license.isPlatinumPlus() && !!location.show;

  useEffect(() => {
    if (!isLoading && listItems.length === 0 && !license.isPlatinumPlus()) {
      history.replace(getEndpointListPath({ name: 'endpointList' }));
    }
  }, [history, isLoading, license, listItems.length]);

  const handleOnSearch = useCallback(
    (query: string) => {
      navigateCallback({ filter: query });
    },
    [navigateCallback]
  );

  function handleItemComponentProps(element: ExceptionListItemSchema): ArtifactEntryCardProps {
    const editAction = {
      icon: 'trash',
      onClick: () => {
        navigateCallback({
          show: 'edit',
          id: element.id,
        });
      },
      'data-test-subj': 'editHostIsolationException',
      children: EDIT_HOST_ISOLATION_EXCEPTION_LABEL,
    };
    const deleteAction = {
      icon: 'trash',
      onClick: () => {
        dispatch({
          type: 'hostIsolationExceptionsMarkToDelete',
          payload: element,
        });
      },
      'data-test-subj': 'deleteHostIsolationException',
      children: DELETE_HOST_ISOLATION_EXCEPTION_LABEL,
    };
    return {
      item: element,
      'data-test-subj': `hostIsolationExceptionsCard`,
      actions: license.isPlatinumPlus() ? [editAction, deleteAction] : [deleteAction],
    };
  }

  const handlePaginatedContentChange: HostIsolationExceptionPaginatedContent['onChange'] =
    useCallback(
      ({ pageIndex, pageSize }) => {
        navigateCallback({
          page_index: pageIndex,
          page_size: pageSize,
        });
      },
      [navigateCallback]
    );

  const handleAddButtonClick = useCallback(
    () =>
      navigateCallback({
        show: 'create',
        id: undefined,
      }),
    [navigateCallback]
  );

  return (
    <AdministrationListPage
      title={
        <FormattedMessage
          id="xpack.securitySolution.hostIsolationExceptions.list.pageTitle"
          defaultMessage="Host Isolation Exceptions"
        />
      }
      actions={
        license.isPlatinumPlus() ? (
          <EuiButton
            fill
            iconType="plusInCircle"
            isDisabled={showFlyout}
            onClick={handleAddButtonClick}
            data-test-subj="hostIsolationExceptionsListAddButton"
          >
            <FormattedMessage
              id="xpack.securitySolution.hostIsolationExceptions.list.addButton"
              defaultMessage="Add Host Isolation Exception"
            />
          </EuiButton>
        ) : (
          []
        )
      }
    >
      {showFlyout && <HostIsolationExceptionsFormFlyout />}

      <SearchExceptions
        defaultValue={location.filter}
        onSearch={handleOnSearch}
        placeholder={i18n.translate(
          'xpack.securitySolution.hostIsolationExceptions.search.placeholder',
          {
            defaultMessage: 'Search on the fields below: name, description, ip',
          }
        )}
      />
      <EuiSpacer size="l" />
      {itemToDelete ? <HostIsolationExceptionDeleteModal /> : null}
      <PaginatedContent<ExceptionListItemSchema, typeof ArtifactEntryCard>
        items={listItems}
        ItemComponent={ArtifactEntryCard}
        itemComponentProps={handleItemComponentProps}
        onChange={handlePaginatedContentChange}
        error={fetchError?.message}
        loading={isLoading}
        pagination={pagination}
        contentClassName="host-isolation-exceptions-container"
        data-test-subj="hostIsolationExceptionsContent"
        noItemsMessage={<HostIsolationExceptionsEmptyState onAdd={handleAddButtonClick} />}
      />
    </AdministrationListPage>
  );
};

HostIsolationExceptionsList.displayName = 'HostIsolationExceptionsList';
