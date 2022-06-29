/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiEmptyPrompt, EuiButton, useEuiTheme } from '@elastic/eui';

import * as i18n from './translations';

interface ExeptionItemsViewerNoItemsComponentProps {
  onCreateExceptionList: () => void;
}

const ExeptionItemsViewerNoItemsComponent = ({
  onCreateExceptionList,
}: ExeptionItemsViewerNoItemsComponentProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

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
        body={<p data-test-subj="exceptionsEmptyPromptBody">{i18n.EXCEPTION_EMPTY_PROMPT_BODY}</p>}
        actions={
          <EuiButton onClick={onCreateExceptionList} iconType="plusInCircle" color="primary" fill>
            {i18n.EXCEPTION_EMPTY_PROMPT_BUTTON}
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
