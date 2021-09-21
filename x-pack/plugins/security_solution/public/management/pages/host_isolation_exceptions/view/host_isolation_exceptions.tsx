/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ExceptionItem } from '../../../../common/components/exceptions/viewer/exception_item';
import {
  getCurrentLocation,
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

type HostIsolationExceptionPaginatedContent = PaginatedContentProps<
  Immutable<ExceptionListItemSchema>,
  typeof ExceptionItem
>;

export const HostIsolationExceptions = () => {
  const listItems = useHostIsolationExceptionsSelector(getListItems);
  const pagination = useHostIsolationExceptionsSelector(getListPagination);
  const isLoading = useHostIsolationExceptionsSelector(getListIsLoading);
  const fetchError = useHostIsolationExceptionsSelector(getListFetchError);
  const location = useHostIsolationExceptionsSelector(getCurrentLocation);

  const navigateCallback = useHostIsolationExceptionsNavigateCallback();

  const handleItemEdit = useCallback(() => {
    // TODO - Will be implemented in a follow up PR
  }, []);
  const handleItemDelete = useCallback(() => {
    // TODO - Will be implemented in a follow up PR
  }, []);

  const handleAddButtonClick = () => {
    // TODO - Will be implemented in a follow up PR
  };
  const handleOnSearch = useCallback(
    (query: string) => {
      // TODO
      // dispatch({ type: 'eventFiltersForceRefresh', payload: { forceRefresh: true } });
      navigateCallback({ filter: query });
    },
    [navigateCallback]
  );
  const handleItemComponentProps: HostIsolationExceptionPaginatedContent['itemComponentProps'] =
    useCallback(
      (exceptionItem) => ({
        exceptionItem: exceptionItem as ExceptionListItemSchema,
        loadingItemIds: [],
        commentsAccordionId: '',
        onEditException: handleItemEdit,
        onDeleteException: handleItemDelete,
        showModified: true,
        showName: true,
        'data-test-subj': `eventFilterCard`,
      }),
      [handleItemDelete, handleItemEdit]
    );

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
  const showFlyout = false;

  return (
    <AdministrationListPage
      title={
        <FormattedMessage
          id="xpack.securitySolution.hostIsolationExceptions.list.pageTitle"
          defaultMessage="Host Isolation Exceptions"
        />
      }
      actions={
        <EuiButton
          fill
          iconType="plusInCircle"
          isDisabled={showFlyout}
          onClick={handleAddButtonClick}
          data-test-subj="eventFiltersPageAddButton"
        >
          <FormattedMessage
            id="xpack.securitySolution.hostIsolationExceptions.list.pageAddButton"
            defaultMessage="Add Host Isolation Exception"
          />
        </EuiButton>
      }
    >
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
      <EuiSpacer size="m" />
      <EuiSpacer size="s" />
      <PaginatedContent<Immutable<ExceptionListItemSchema>, typeof ExceptionItem>
        items={listItems}
        ItemComponent={ExceptionItem}
        itemComponentProps={handleItemComponentProps}
        onChange={handlePaginatedContentChange}
        error={fetchError?.message}
        loading={isLoading}
        pagination={pagination}
        contentClassName="host-isolation-exceptions-container"
        data-test-subj="HostIsolationExceptionsContent"
        noItemsMessage={<h1>{' Nothing yet'}</h1>}
      />
    </AdministrationListPage>
  );
};
