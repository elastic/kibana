/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { euiStyled } from '../../../../../observability/public';
import { LogEntryExampleMessagesEmptyIndicator } from './log_entry_examples_empty_indicator';
import { LogEntryExampleMessagesFailureIndicator } from './log_entry_examples_failure_indicator';
import { LogEntryExampleMessagesLoadingIndicator } from './log_entry_examples_loading_indicator';

interface Props {
  isLoading: boolean;
  hasFailedLoading: boolean;
  hasResults: boolean;
  exampleCount: number;
  onReload: () => void;
}
export const LogEntryExampleMessages: React.FunctionComponent<Props> = ({
  isLoading,
  hasFailedLoading,
  exampleCount,
  hasResults,
  onReload,
  children,
}) => {
  return (
    <Wrapper>
      {isLoading ? (
        <LogEntryExampleMessagesLoadingIndicator exampleCount={exampleCount} />
      ) : hasFailedLoading ? (
        <LogEntryExampleMessagesFailureIndicator onRetry={onReload} />
      ) : !hasResults ? (
        <LogEntryExampleMessagesEmptyIndicator onReload={onReload} />
      ) : (
        children
      )}
    </Wrapper>
  );
};

const Wrapper = euiStyled.div`
  align-items: stretch;
  flex-direction: column;
  flex: 1 0 0%;
  overflow: hidden;
`;
