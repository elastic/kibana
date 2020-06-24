/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { euiStyled } from '../../../../../observability/public';
import { LogEntryExampleMessage } from './log_entry_example';
import { LogEntryExampleMessagesEmptyIndicator } from './log_entry_examples_empty_indicator';
import { LogEntryExampleMessagesFailureIndicator } from './log_entry_examples_failure_indicator';
import { LogEntryExampleMessagesLoadingIndicator } from './log_entry_examples_loading_indicator';

interface Props {
  isLoading: boolean;
  hasFailedLoading: boolean;
  examples: Array<{
    dataset: string;
    message: string;
    timestamp: number;
  }>;
  exampleCount: number;
  onReload: () => void;
}
export const LogEntryExampleMessages: React.FunctionComponent<Props> = ({
  examples,
  isLoading,
  hasFailedLoading,
  exampleCount,
  onReload,
}) => {
  return (
    <Wrapper>
      {isLoading ? (
        <LogEntryExampleMessagesLoadingIndicator exampleCount={exampleCount} />
      ) : hasFailedLoading ? (
        <LogEntryExampleMessagesFailureIndicator onRetry={onReload} />
      ) : examples.length === 0 ? (
        <LogEntryExampleMessagesEmptyIndicator onReload={onReload} />
      ) : (
        examples.map((example, exampleIndex) => (
          <LogEntryExampleMessage
            dataset={example.dataset}
            key={exampleIndex}
            message={example.message}
            timestamp={example.timestamp}
          />
        ))
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
