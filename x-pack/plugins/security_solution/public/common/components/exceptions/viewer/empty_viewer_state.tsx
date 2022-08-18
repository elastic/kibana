/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiEmptyPromptProps } from '@elastic/eui';
import { EuiButton, useEuiTheme, EuiPageTemplate, EuiLoadingLogo } from '@elastic/eui';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';

interface ExeptionItemsViewerNoItemsComponentProps {
  listType: ExceptionListTypeEnum;
  currentState: string;
  onCreateExceptionListItem: () => void;
}

const ExeptionItemsViewerEmptyPromptsComponent = ({
  listType,
  currentState,
  onCreateExceptionListItem,
}: ExeptionItemsViewerNoItemsComponentProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  let emptyPromptProps: Partial<EuiEmptyPromptProps>;
  switch (currentState) {
    case 'error':
      emptyPromptProps = {
        color: 'danger',
        iconType: 'alert',
        title: <h2>{i18n.EXCEPTION_ERROR_TITLE}</h2>,
        body: <p>{i18n.EXCEPTION_ERROR_DESCRIPTION}</p>,
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
      };
      break;
    default:
      emptyPromptProps = {
        color: 'subdued',
        icon: <EuiLoadingLogo logo="logoKibana" size="xl" />,
        title: <h2>{i18n.EXCEPTION_LOADING_TITLE}</h2>,
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
