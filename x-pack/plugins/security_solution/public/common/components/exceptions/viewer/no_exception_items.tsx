/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexItem, EuiEmptyPrompt, EuiButton, useEuiTheme } from '@elastic/eui';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';

interface ExeptionItemsViewerNoItemsComponentProps {
  listType: ExceptionListTypeEnum;
  onCreateExceptionListItem: () => void;
}

const ExeptionItemsViewerNoItemsComponent = ({
  listType,
  onCreateExceptionListItem,
}: ExeptionItemsViewerNoItemsComponentProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const handleAddException = useCallback(() => {
    onCreateExceptionListItem();
  }, [onCreateExceptionListItem]);

  return (
    <EuiFlexItem grow={1}>
      <EuiEmptyPrompt
        paddingSize="l"
        color="subdued"
        iconType="plusInCircle"
        iconColor={euiTheme.colors.darkestShade}
        title={
          <h2 data-test-subj="exceptionsEmptyPromptTitle">{i18n.EXCEPTION_EMPTY_PROMPT_TITLE}</h2>
        }
        body={
          <p data-test-subj="exceptionsEmptyPromptBody">
            {listType === ExceptionListTypeEnum.ENDPOINT
              ? i18n.EXCEPTION_EMPTY_ENDPOINT_PROMPT_BODY
              : i18n.EXCEPTION_EMPTY_PROMPT_BODY}
          </p>
        }
        actions={
          <EuiButton onClick={handleAddException} iconType="plusInCircle" color="primary" fill>
            {listType === ExceptionListTypeEnum.ENDPOINT
              ? i18n.EXCEPTION_EMPTY_PROMPT_ENDPOINT_BUTTON
              : i18n.EXCEPTION_EMPTY_PROMPT_BUTTON}
          </EuiButton>
        }
        data-test-subj="exceptionsEmptyPrompt"
      />
    </EuiFlexItem>
  );
};

ExeptionItemsViewerNoItemsComponent.displayName = 'ExeptionItemsViewerNoItemsComponent';

export const ExeptionItemsViewerNoItems = React.memo(ExeptionItemsViewerNoItemsComponent);

ExeptionItemsViewerNoItems.displayName = 'ExeptionItemsViewerNoItems';
