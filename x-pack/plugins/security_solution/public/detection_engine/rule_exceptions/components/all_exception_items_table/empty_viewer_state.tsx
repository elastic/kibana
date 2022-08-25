/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiButton,
  useEuiTheme,
  EuiPageTemplate,
  EuiLoadingLogo,
} from '@elastic/eui';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';
import type { ViewerState } from './reducer';

interface ExeptionItemsViewerEmptyPromptsComponentProps {
  listType: ExceptionListTypeEnum;
  currentState: ViewerState;
  onCreateExceptionListItem: () => void;
}

const ExeptionItemsViewerEmptyPromptsComponent = ({
  listType,
  currentState,
  onCreateExceptionListItem,
}: ExeptionItemsViewerEmptyPromptsComponentProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  let emptyPromptProps: Partial<EuiEmptyPromptProps>;
  switch (currentState) {
    case 'error':
      emptyPromptProps = {
        color: 'danger',
        iconType: 'alert',
        title: <h2>{i18n.EXCEPTION_ERROR_TITLE}</h2>,
        body: <p>{i18n.EXCEPTION_ERROR_DESCRIPTION}</p>,
        'data-test-subj': 'exceptionItemViewerEmptyPrompts-error',
      };
      break;
    case 'empty':
      emptyPromptProps = {
        color: 'subdued',
        iconType: 'plusInCircle',
        iconColor: euiTheme.colors.darkestShade,
        title: (
          <h2 data-test-subj="exceptionsEmptyPromptTitle">{i18n.EXCEPTION_EMPTY_PROMPT_TITLE}</h2>
        ),
        body: (
          <p data-test-subj="exceptionsEmptyPromptBody">
            {listType === ExceptionListTypeEnum.ENDPOINT
              ? i18n.EXCEPTION_EMPTY_ENDPOINT_PROMPT_BODY
              : i18n.EXCEPTION_EMPTY_PROMPT_BODY}
          </p>
        ),
        actions: [
          <EuiButton
            data-test-subj="exceptionsEmptyPromptButton"
            onClick={onCreateExceptionListItem}
            iconType="plusInCircle"
            color="primary"
            fill
          >
            {listType === ExceptionListTypeEnum.ENDPOINT
              ? i18n.EXCEPTION_EMPTY_PROMPT_ENDPOINT_BUTTON
              : i18n.EXCEPTION_EMPTY_PROMPT_BUTTON}
          </EuiButton>,
        ],
        'data-test-subj': `exceptionItemViewerEmptyPrompts-empty-${listType}`,
      };
      break;
    case 'empty_search':
      emptyPromptProps = {
        color: 'subdued',
        title: (
          <h2 data-test-subj="exceptionsEmptySearchPromptTitle">
            {i18n.EXCEPTION_NO_SEARCH_RESULTS_PROMPT_TITLE}
          </h2>
        ),
        body: (
          <p data-test-subj="exceptionsEmptySearchPromptBody">
            {i18n.EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY}
          </p>
        ),
        'data-test-subj': 'exceptionItemViewerEmptyPrompts-emptySearch',
      };
      break;
    default:
      emptyPromptProps = {
        color: 'subdued',
        icon: <EuiLoadingLogo logo="logoKibana" size="xl" />,
        title: <h2>{i18n.EXCEPTION_LOADING_TITLE}</h2>,
        'data-test-subj': 'exceptionItemViewerEmptyPrompts-loading',
      };
      break;
  }

  return (
    <EuiPageTemplate minHeight="0">
      <EuiEmptyPrompt {...emptyPromptProps} />
    </EuiPageTemplate>
  );
};

export const ExeptionItemsViewerEmptyPrompts = React.memo(ExeptionItemsViewerEmptyPromptsComponent);

ExeptionItemsViewerEmptyPrompts.displayName = 'ExeptionItemsViewerEmptyPrompts';
