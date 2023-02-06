/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiLoadingContent,
  EuiImage,
  EuiEmptyPrompt,
  EuiButton,
  useEuiTheme,
  EuiPanel,
} from '@elastic/eui';

import * as i18n from './translations';
import type { ViewerState } from './reducer';
import illustration from '../../../../common/images/illustration_product_no_results_magnifying_glass.svg';

interface ExeptionItemsViewerEmptyPromptsComponentProps {
  isReadOnly: boolean;
  isEndpoint: boolean;
  currentState: ViewerState;
  onCreateExceptionListItem: () => void;
}

const ExeptionItemsViewerEmptyPromptsComponent = ({
  isReadOnly,
  isEndpoint,
  currentState,
  onCreateExceptionListItem,
}: ExeptionItemsViewerEmptyPromptsComponentProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  const content = useMemo(() => {
    switch (currentState) {
      case 'error':
        return (
          <EuiEmptyPrompt
            color={'danger'}
            iconType={'alert'}
            title={<h2>{i18n.EXCEPTION_ERROR_TITLE}</h2>}
            body={<p>{i18n.EXCEPTION_ERROR_DESCRIPTION}</p>}
            data-test-subj={'exceptionItemViewerEmptyPrompts-error'}
          />
        );
      case 'empty':
        return (
          <EuiEmptyPrompt
            color={'subdued'}
            iconType={'plusInCircle'}
            iconColor={euiTheme.colors.darkestShade}
            title={
              <h2 data-test-subj="exceptionsEmptyPromptTitle">
                {i18n.EXCEPTION_EMPTY_PROMPT_TITLE}
              </h2>
            }
            body={
              <p data-test-subj="exceptionsEmptyPromptBody">
                {isEndpoint
                  ? i18n.EXCEPTION_EMPTY_ENDPOINT_PROMPT_BODY
                  : i18n.EXCEPTION_EMPTY_PROMPT_BODY}
              </p>
            }
            actions={[
              <EuiButton
                data-test-subj="exceptionsEmptyPromptButton"
                onClick={onCreateExceptionListItem}
                iconType="plusInCircle"
                color="primary"
                isDisabled={isReadOnly}
                fill
              >
                {isEndpoint
                  ? i18n.EXCEPTION_EMPTY_PROMPT_ENDPOINT_BUTTON
                  : i18n.EXCEPTION_EMPTY_PROMPT_BUTTON}
              </EuiButton>,
            ]}
            data-test-subj="exceptionItemViewerEmptyPrompts-empty"
          />
        );
      case 'empty_search':
        return (
          <EuiEmptyPrompt
            color={'plain'}
            layout={'horizontal'}
            hasBorder={true}
            hasShadow={false}
            icon={<EuiImage size="fullWidth" alt="" url={illustration} />}
            title={<h3>{i18n.EXCEPTION_NO_SEARCH_RESULTS_PROMPT_TITLE}</h3>}
            body={<p>{i18n.EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY}</p>}
            data-test-subj="exceptionItemViewerEmptyPrompts-emptySearch"
          />
        );
      default:
        return (
          <EuiLoadingContent lines={4} data-test-subj="exceptionItemViewerEmptyPrompts-loading" />
        );
    }
  }, [
    currentState,
    euiTheme.colors.darkestShade,
    isReadOnly,
    isEndpoint,
    onCreateExceptionListItem,
  ]);

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      color={currentState === 'empty_search' ? 'subdued' : 'transparent'}
      style={{
        margin: `${euiTheme.size.l} 0`,
        padding: `${euiTheme.size.l} 0`,
      }}
    >
      {content}
    </EuiPanel>
  );
};

export const ExeptionItemsViewerEmptyPrompts = React.memo(ExeptionItemsViewerEmptyPromptsComponent);

ExeptionItemsViewerEmptyPrompts.displayName = 'ExeptionItemsViewerEmptyPrompts';
