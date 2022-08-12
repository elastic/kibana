/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingLogo } from '@elastic/eui';
import styled from 'styled-components';

import type {
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';
import { ExceptionItemCard } from './exception_item_card';
import type { ExceptionListItemIdentifiers } from '../types';
import { ExeptionItemsViewerEmptySearchResults } from './no_search_results';
import { ExeptionItemsViewerNoItems } from './no_exception_items';

const MyFlexItem = styled(EuiFlexItem)`
  margin: ${({ theme }) => `${theme.eui.euiSize} 0`};
  &:first-child {
    margin: ${({ theme }) => `${theme.eui.euiSizeXS} 0 ${theme.eui.euiSize}`};
  }
`;

interface ExceptionItemsViewerProps {
  showEmpty: boolean;
  showNoResults: boolean;
  isInitLoading: boolean;
  disableActions: boolean;
  exceptions: ExceptionListItemSchema[];
  loadingItemIds: ExceptionListItemIdentifiers[];
  listType: ExceptionListTypeEnum;
  ruleReferences: unknown;
  onCreateExceptionListItem: () => void;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditExceptionItem: (item: ExceptionListItemSchema) => void;
}

const ExceptionItemsViewerComponent: React.FC<ExceptionItemsViewerProps> = ({
  showEmpty,
  showNoResults,
  isInitLoading,
  exceptions,
  loadingItemIds,
  listType,
  disableActions,
  ruleReferences,
  onDeleteException,
  onEditExceptionItem,
  onCreateExceptionListItem,
}): JSX.Element => {
  return (
    <EuiFlexGroup direction="column" className="eui-yScrollWithShadows">
      {isInitLoading && (
        <EuiEmptyPrompt
          icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
          title={<h2>{i18n.EXCEPTION_LOADING_TITLE}</h2>}
          data-test-subj="exceptionsLoadingPrompt"
        />
      )}
      {showNoResults && <ExeptionItemsViewerEmptySearchResults />}
      {showEmpty && (
        <ExeptionItemsViewerNoItems
          listType={listType}
          onCreateExceptionListItem={onCreateExceptionListItem}
        />
      )}
      {!showEmpty && !showNoResults && !isInitLoading && (
        <EuiFlexItem grow={false} className="eui-yScrollWithShadows">
          <EuiFlexGroup data-test-subj="exceptionsContainer" gutterSize="none" direction="column">
            {!isInitLoading &&
              exceptions.length > 0 &&
              exceptions.map((exception) => (
                <MyFlexItem data-test-subj="exceptionItemContainer" grow={false} key={exception.id}>
                  <ExceptionItemCard
                    disableActions={disableActions}
                    loadingItemIds={loadingItemIds}
                    exceptionItem={exception}
                    listType={listType}
                    ruleReferences={
                      ruleReferences != null ? ruleReferences[exception.list_id] : null
                    }
                    onDeleteException={onDeleteException}
                    onEditException={onEditExceptionItem}
                    dataTestSubj="exceptionItemsViewerItem"
                  />
                </MyFlexItem>
              ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

ExceptionItemsViewerComponent.displayName = 'ExceptionItemsViewerComponent';

export const ExceptionsViewerItems = React.memo(ExceptionItemsViewerComponent);

ExceptionsViewerItems.displayName = 'ExceptionsViewerItems';
