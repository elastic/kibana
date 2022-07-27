/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from '../translations';
import { ExceptionItemCard } from './exception_item_card';
import type { ExceptionListItemIdentifiers } from '../types';

const MyFlexItem = styled(EuiFlexItem)`
  margin: ${({ theme }) => `${theme.eui.euiSize} 0`};

  &:first-child {
    margin: ${({ theme }) => `${theme.eui.euiSizeXS} 0 ${theme.eui.euiSize}`};
  }
`;

const MyExceptionItemContainer = styled(EuiFlexGroup)`
  margin: ${({ theme }) => `0 ${theme.eui.euiSize} ${theme.eui.euiSize} 0`};
`;

interface ExceptionsViewerItemsProps {
  showEmpty: boolean;
  showNoResults: boolean;
  isInitLoading: boolean;
  disableActions: boolean;
  exceptions: ExceptionListItemSchema[];
  loadingItemIds: ExceptionListItemIdentifiers[];
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditExceptionItem: (item: ExceptionListItemSchema) => void;
}

const ExceptionsViewerItemsComponent: React.FC<ExceptionsViewerItemsProps> = ({
  showEmpty,
  showNoResults,
  isInitLoading,
  exceptions,
  loadingItemIds,
  onDeleteException,
  onEditExceptionItem,
  disableActions,
}): JSX.Element => (
  <EuiFlexGroup direction="column" className="eui-yScrollWithShadows">
    {showEmpty || showNoResults || isInitLoading ? (
      <EuiFlexItem grow={1}>
        <EuiEmptyPrompt
          iconType={showNoResults ? 'searchProfilerApp' : 'list'}
          title={
            <h2 data-test-subj="exceptionsEmptyPromptTitle">
              {showNoResults ? '' : i18n.EXCEPTION_EMPTY_PROMPT_TITLE}
            </h2>
          }
          body={
            <p data-test-subj="exceptionsEmptyPromptBody">
              {showNoResults
                ? i18n.EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY
                : i18n.EXCEPTION_EMPTY_PROMPT_BODY}
            </p>
          }
          data-test-subj="exceptionsEmptyPrompt"
        />
      </EuiFlexItem>
    ) : (
      <EuiFlexItem grow={false} className="eui-yScrollWithShadows">
        <MyExceptionItemContainer
          data-test-subj="exceptionsContainer"
          gutterSize="none"
          direction="column"
        >
          {!isInitLoading &&
            exceptions.length > 0 &&
            exceptions.map((exception) => (
              <MyFlexItem data-test-subj="exceptionItemContainer" grow={false} key={exception.id}>
                <ExceptionItemCard
                  disableActions={disableActions}
                  loadingItemIds={loadingItemIds}
                  exceptionItem={exception}
                  onDeleteException={onDeleteException}
                  onEditException={onEditExceptionItem}
                  dataTestSubj={`exceptionItemCard-${exception.name}`}
                />
              </MyFlexItem>
            ))}
        </MyExceptionItemContainer>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

ExceptionsViewerItemsComponent.displayName = 'ExceptionsViewerItemsComponent';

export const ExceptionsViewerItems = React.memo(ExceptionsViewerItemsComponent);

ExceptionsViewerItems.displayName = 'ExceptionsViewerItems';
