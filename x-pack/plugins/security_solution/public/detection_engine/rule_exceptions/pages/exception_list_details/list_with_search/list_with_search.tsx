/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiPanel } from '@elastic/eui';

import type {
  ExceptionListTypeEnum,
  ExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  SearchBar,
  ExceptionItems,
  EmptyViewerState,
  ViewerStatus,
} from '@kbn/securitysolution-exception-list-components';
import * as i18n from '../translations';

import { useListWithSearchComponent } from './use_list_with_search';

interface ListWithSearchComponentProps {
  list: ExceptionListSchema;
}

const ListWithSearchComponent: FC<ListWithSearchComponentProps> = ({ list }) => {
  const {
    listName,
    isReadOnly,
    exceptions,
    listType,
    lastUpdated,
    pagination,
    emptyViewerTitle,
    emptyViewerBody,
    viewerStatus,
    ruleReferences,
    onSearch,
    onAddExceptionClick,
    onDeleteException,
    onEditExceptionItem,
    onPaginationChange,
    onCreateExceptionListItem,
  } = useListWithSearchComponent(list);

  return viewerStatus === ViewerStatus.EMPTY || viewerStatus === ViewerStatus.LOADING ? (
    <EmptyViewerState
      isReadOnly={isReadOnly}
      viewerStatus={viewerStatus as ViewerStatus}
      onCreateExceptionListItem={onCreateExceptionListItem}
      title={i18n.EXCEPTION_LIST_EMPTY_VIEWER_TITLE}
      body={i18n.EXCEPTION_LIST_EMPTY_VIEWER_BODY(listName)}
      buttonText={i18n.EXCEPTION_LIST_EMPTY_VIEWER_BUTTON}
    />
  ) : (
    <EuiPanel hasBorder={false} hasShadow={false}>
      <>
        <SearchBar
          addExceptionButtonText={i18n.EXCEPTION_LIST_EMPTY_SEARCH_BAR_BUTTON}
          listType={listType as ExceptionListTypeEnum}
          onSearch={onSearch}
          onAddExceptionClick={onAddExceptionClick}
          isSearching={viewerStatus === ViewerStatus.SEARCHING}
        />
        <ExceptionItems
          viewerStatus={viewerStatus as ViewerStatus}
          listType={listType as ExceptionListTypeEnum}
          ruleReferences={ruleReferences}
          isReadOnly={isReadOnly}
          exceptions={exceptions}
          emptyViewerTitle={emptyViewerTitle}
          emptyViewerBody={emptyViewerBody}
          pagination={pagination}
          lastUpdated={lastUpdated}
          onPaginationChange={onPaginationChange}
          onEditExceptionItem={onEditExceptionItem}
          onDeleteException={onDeleteException}
        />
      </>
    </EuiPanel>
  );
};

ListWithSearchComponent.displayName = 'ListWithSearchComponent';

export const ListWithSearch = React.memo(ListWithSearchComponent);

ListWithSearch.displayName = 'ListWithSearch';
