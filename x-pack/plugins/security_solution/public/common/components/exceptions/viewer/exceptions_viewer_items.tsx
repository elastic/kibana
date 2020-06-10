/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from '../translations';
import { ExceptionListItemSchema, ApiProps } from '../types';
import { ExceptionItem } from './exception_item';
import { AndOrBadge } from '../../and_or_badge';

const MyFlexItem = styled(EuiFlexItem)`
  margin: ${({ theme }) => `${theme.eui.euiSize} 0`};

  &:first-child {
    margin: ${({ theme }) => `${theme.eui.euiSizeXS} 0 ${theme.eui.euiSize}`};
  }
`;

const MyExceptionsContainer = styled(EuiFlexGroup)`
  height: 600px;
  overflow: hidden;
`;

const MyExceptionItemContainer = styled(EuiFlexGroup)`
  margin: ${({ theme }) => `0 ${theme.eui.euiSize} ${theme.eui.euiSize} 0`};
`;

interface ExceptionsViewerItemsProps {
  showEmpty: boolean;
  isInitLoading: boolean;
  exceptions: ExceptionListItemSchema[];
  loadingItemIds: ApiProps[];
  commentsAccordionId: string;
  onDeleteException: (arg: ApiProps) => void;
  onEditExceptionItem: (item: ExceptionListItemSchema) => void;
}

export const ExceptionsViewerItems: React.FC<ExceptionsViewerItemsProps> = ({
  showEmpty,
  isInitLoading,
  exceptions,
  loadingItemIds,
  commentsAccordionId,
  onDeleteException,
  onEditExceptionItem,
}) => (
  <MyExceptionsContainer direction="column" className="eui-yScrollWithShadows">
    {showEmpty ? (
      <EuiFlexItem grow={1}>
        <EuiEmptyPrompt
          iconType="advancedSettingsApp"
          title={<h2>{i18n.EXCEPTION_EMPTY_PROMPT_TITLE}</h2>}
          body={<p>{i18n.EXCEPTION_EMPTY_PROMPT_BODY}</p>}
          data-test-subj="exceptionsEmptyPrompt"
        />
      </EuiFlexItem>
    ) : (
      <EuiFlexItem grow={false} className="eui-yScrollWithShadows">
        <MyExceptionItemContainer gutterSize="none" direction="column">
          {!isInitLoading &&
            exceptions.length > 0 &&
            exceptions.map((exception, index) => (
              <MyFlexItem grow={false} key={exception.id}>
                {index !== 0 ? (
                  <>
                    <AndOrBadge type="or" />
                    <EuiSpacer />
                  </>
                ) : (
                  <EuiSpacer size="s" />
                )}
                <ExceptionItem
                  loadingItemIds={loadingItemIds}
                  commentsAccordionId={commentsAccordionId}
                  exceptionItem={exception}
                  handleDelete={onDeleteException}
                  handleEdit={onEditExceptionItem}
                />
              </MyFlexItem>
            ))}
        </MyExceptionItemContainer>
      </EuiFlexItem>
    )}
  </MyExceptionsContainer>
);

ExceptionsViewerItems.displayName = 'ExceptionsViewerItems';
