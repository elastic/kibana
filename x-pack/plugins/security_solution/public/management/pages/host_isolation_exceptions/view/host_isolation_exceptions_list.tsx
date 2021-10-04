/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
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
import { ArtifactEntryCard, ArtifactEntryCardProps } from '../../../components/artifact_entry_card';
import { HostIsolationExceptionsEmptyState } from './components/empty';

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

  const navigateCallback = useHostIsolationExceptionsNavigateCallback();

  const handleOnSearch = useCallback(
    (query: string) => {
      navigateCallback({ filter: query });
    },
    [navigateCallback]
  );

  const handleItemComponentProps = (element: ExceptionListItemSchema): ArtifactEntryCardProps => ({
    item: element,
    'data-test-subj': `hostIsolationExceptionsCard`,
  });

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

  return (
    <AdministrationListPage
      title={
        <FormattedMessage
          id="xpack.securitySolution.hostIsolationExceptions.list.pageTitle"
          defaultMessage="Host Isolation Exceptions"
        />
      }
      actions={[]}
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
      <EuiSpacer size="l" />
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
        noItemsMessage={<HostIsolationExceptionsEmptyState />}
      />
    </AdministrationListPage>
  );
};

HostIsolationExceptionsList.displayName = 'HostIsolationExceptionsList';
