/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import type { Pagination as PaginationType } from '@elastic/eui';

import type {
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import { EmptyViewerState, ExceptionItemCard, ExceptionsUtility, Pagination } from '..';

import type {
  RuleReferences,
  ExceptionListItemIdentifiers,
  ViewerStatus,
  GetExceptionItemProps,
} from '../types';

const MyFlexItem = styled(EuiFlexItem)`
  margin: ${({ theme }) => `${theme.eui.euiSize} 0`};
  &:first-child {
    margin: ${({ theme }) => `${theme.eui.euiSizeXS} 0 ${theme.eui.euiSize}`};
  }
`;

interface ExceptionItemsProps {
  lastUpdated: string | number | null;
  viewerStatus: ViewerStatus;
  isReadOnly: boolean;
  emptyViewerTitle?: string;
  emptyViewerBody?: string;
  emptyViewerButtonText?: string;
  exceptions: ExceptionListItemSchema[];
  listType: ExceptionListTypeEnum;
  ruleReferences: RuleReferences;
  pagination: PaginationType;
  onCreateExceptionListItem?: () => void;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditExceptionItem: (item: ExceptionListItemSchema) => void;
  onPaginationChange: (arg: GetExceptionItemProps) => void;
}

const ExceptionItemsComponent: FC<ExceptionItemsProps> = ({
  lastUpdated,
  viewerStatus,
  isReadOnly,
  exceptions,
  listType,
  ruleReferences,

  emptyViewerTitle,
  emptyViewerBody,
  emptyViewerButtonText,

  pagination,
  onPaginationChange,

  onDeleteException,
  onEditExceptionItem,
  onCreateExceptionListItem,
}) => {
  if (!exceptions?.length || viewerStatus)
    return (
      <EmptyViewerState
        isReadOnly={isReadOnly}
        title={emptyViewerTitle}
        viewerStatus={viewerStatus}
        buttonText={emptyViewerButtonText}
        body={emptyViewerBody}
        onCreateExceptionListItem={onCreateExceptionListItem}
      />
    );
  return (
    <>
      <ExceptionsUtility pagination={pagination} lastUpdated={lastUpdated} />
      <EuiFlexGroup direction="column" className="eui-yScrollWithShadows">
        <EuiFlexItem grow={false} className="eui-yScrollWithShadows">
          <EuiFlexGroup data-test-subj="exceptionsContainer" gutterSize="none" direction="column">
            {exceptions.map((exception) => (
              <MyFlexItem data-test-subj="exceptionItemContainer" grow={false} key={exception.id}>
                <ExceptionItemCard
                  disableActions={isReadOnly}
                  exceptionItem={exception}
                  listType={listType}
                  ruleReferences={
                    Object.keys(ruleReferences).length ? ruleReferences[exception.list_id] : []
                  }
                  onDeleteException={onDeleteException}
                  onEditException={onEditExceptionItem}
                  dataTestSubj="exceptionItemsViewerItem"
                />
              </MyFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Pagination
        dataTestSubj="list_with_search_pagination"
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />
    </>
  );
};

ExceptionItemsComponent.displayName = 'ExceptionItemsComponent';

export const ExceptionItems = React.memo(ExceptionItemsComponent);

ExceptionItems.displayName = 'ExceptionsItems';
