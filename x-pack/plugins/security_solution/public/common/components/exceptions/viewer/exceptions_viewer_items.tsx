/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import type {
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionItemCard } from './exception_item_card';
import type { ExceptionListItemIdentifiers } from '../types';
import type { RuleReferences } from '../use_find_references';

const MyFlexItem = styled(EuiFlexItem)`
  margin: ${({ theme }) => `${theme.eui.euiSize} 0`};
  &:first-child {
    margin: ${({ theme }) => `${theme.eui.euiSizeXS} 0 ${theme.eui.euiSize}`};
  }
`;

interface ExceptionItemsViewerProps {
  disableActions: boolean;
  exceptions: ExceptionListItemSchema[];
  loadingItemIds: ExceptionListItemIdentifiers[];
  listType: ExceptionListTypeEnum;
  ruleReferences: RuleReferences | null;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditExceptionItem: (item: ExceptionListItemSchema) => void;
}

const ExceptionItemsViewerComponent: React.FC<ExceptionItemsViewerProps> = ({
  exceptions,
  loadingItemIds,
  listType,
  disableActions,
  ruleReferences,
  onDeleteException,
  onEditExceptionItem,
}): JSX.Element => {
  return (
    <EuiFlexGroup direction="column" className="eui-yScrollWithShadows">
      <EuiFlexItem grow={false} className="eui-yScrollWithShadows">
        <EuiFlexGroup data-test-subj="exceptionsContainer" gutterSize="none" direction="column">
          {exceptions.map((exception) => (
            <MyFlexItem data-test-subj="exceptionItemContainer" grow={false} key={exception.id}>
              <ExceptionItemCard
                disableActions={disableActions}
                loadingItemIds={loadingItemIds}
                exceptionItem={exception}
                listType={listType}
                ruleReferences={ruleReferences != null ? ruleReferences[exception.list_id] : []}
                onDeleteException={onDeleteException}
                onEditException={onEditExceptionItem}
                dataTestSubj="exceptionItemsViewerItem"
              />
            </MyFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ExceptionItemsViewerComponent.displayName = 'ExceptionItemsViewerComponent';

export const ExceptionsViewerItems = React.memo(ExceptionItemsViewerComponent);

ExceptionsViewerItems.displayName = 'ExceptionsViewerItems';
