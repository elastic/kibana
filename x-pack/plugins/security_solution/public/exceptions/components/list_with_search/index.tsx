/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiPanel } from '@elastic/eui';

import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import {
  SearchBar,
  EmptyViewerState,
  ViewerStatus,
} from '@kbn/securitysolution-exception-list-components';
import { AddExceptionFlyout } from '../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import { EditExceptionFlyout } from '../../../detection_engine/rule_exceptions/components/edit_exception_flyout';
import * as i18n from '../../translations';
import { useListWithSearchComponent } from '../../hooks/use_list_with_search';
import { ListExceptionItems } from '..';

interface ListWithSearchComponentProps {
  list: ExceptionListSchema;
  isReadOnly: boolean;
  refreshExceptions?: boolean;
}

const ListWithSearchComponent: FC<ListWithSearchComponentProps> = ({
  list,
  isReadOnly,
  refreshExceptions,
}) => {
  const {
    listName,
    exceptions,
    listType,
    lastUpdated,
    pagination,
    emptyViewerTitle,
    emptyViewerBody,
    emptyViewerButtonText,
    viewerStatus,
    ruleReferences,
    showAddExceptionFlyout,
    showEditExceptionFlyout,
    exceptionToEdit,
    exceptionViewerStatus,
    onSearch,
    onAddExceptionClick,
    onDeleteException,
    onEditExceptionItem,
    onPaginationChange,
    handleCancelExceptionItemFlyout,
    handleConfirmExceptionFlyout,
  } = useListWithSearchComponent(list, refreshExceptions);
  return (
    <>
      {showAddExceptionFlyout ? (
        <AddExceptionFlyout
          rules={null}
          isBulkAction={false}
          isEndpointItem={listType === ExceptionListTypeEnum.ENDPOINT}
          sharedListToAddTo={[list]}
          onCancel={handleCancelExceptionItemFlyout}
          onConfirm={handleConfirmExceptionFlyout}
          data-test-subj="addExceptionItemFlyoutInList"
          showAlertCloseOptions={false} // TODO ask if we need it
          isNonTimeline={true}
          // ask if we need the add to rule/list section and which list should we link the exception here
        />
      ) : viewerStatus === ViewerStatus.EMPTY || viewerStatus === ViewerStatus.LOADING ? (
        <EmptyViewerState
          isReadOnly={isReadOnly}
          viewerStatus={viewerStatus as ViewerStatus}
          onEmptyButtonStateClick={onAddExceptionClick}
          title={i18n.EXCEPTION_LIST_EMPTY_VIEWER_TITLE}
          body={i18n.EXCEPTION_LIST_EMPTY_VIEWER_BODY(listName)}
          buttonText={i18n.EXCEPTION_LIST_EMPTY_VIEWER_BUTTON}
        />
      ) : (
        <EuiPanel hasBorder={false} hasShadow={false}>
          <>
            {showEditExceptionFlyout && exceptionToEdit && (
              <EditExceptionFlyout
                list={list}
                itemToEdit={exceptionToEdit}
                showAlertCloseOptions
                openedFromListDetailPage
                onCancel={handleCancelExceptionItemFlyout}
                onConfirm={handleConfirmExceptionFlyout}
                data-test-subj="editExceptionItemFlyoutInList"
              />
            )}
            <SearchBar
              addExceptionButtonText={
                listType === ExceptionListTypeEnum.ENDPOINT
                  ? i18n.EXCEPTION_LIST_EMPTY_SEARCH_BAR_BUTTON_ENDPOINT
                  : i18n.EXCEPTION_LIST_EMPTY_SEARCH_BAR_BUTTON
              }
              listType={listType as ExceptionListTypeEnum}
              onSearch={onSearch}
              onAddExceptionClick={onAddExceptionClick}
              isSearching={viewerStatus === ViewerStatus.SEARCHING}
              isButtonFilled={false}
              buttonIconType="plusInCircle"
            />
            <ListExceptionItems
              viewerStatus={exceptionViewerStatus as ViewerStatus}
              listType={listType as ExceptionListTypeEnum}
              ruleReferences={ruleReferences}
              isReadOnly={isReadOnly}
              exceptions={exceptions}
              emptyViewerTitle={emptyViewerTitle}
              emptyViewerBody={emptyViewerBody}
              emptyViewerButtonText={emptyViewerButtonText}
              pagination={pagination}
              lastUpdated={lastUpdated}
              onPaginationChange={onPaginationChange}
              onEditExceptionItem={onEditExceptionItem}
              onDeleteException={onDeleteException}
              onCreateExceptionListItem={onAddExceptionClick}
            />
          </>
        </EuiPanel>
      )}
    </>
  );
};

ListWithSearchComponent.displayName = 'ListWithSearchComponent';

export const ListWithSearch = React.memo(ListWithSearchComponent);

ListWithSearch.displayName = 'ListWithSearch';
