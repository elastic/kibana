/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';

import { euiStyled } from '../../../../../../../observability/public';
import { TimeRange } from '../../../../../../common/http_api/shared';
import { useLogEntryCategoryExamples } from '../../use_log_entry_category_examples';
import { CategoryExampleMessage } from './category_example_message';
import { CategoryExampleMessagesEmptyIndicator } from './category_example_messages_empty_indicator';
import { CategoryExampleMessagesFailureIndicator } from './category_example_messages_failure_indicator';
import { CategoryExampleMessagesLoadingIndicator } from './category_example_messages_loading_indicator';

const exampleCount = 5;

export const CategoryDetailsRow: React.FunctionComponent<{
  categoryId: number;
  timeRange: TimeRange;
  sourceId: string;
}> = ({ categoryId, timeRange, sourceId }) => {
  const {
    getLogEntryCategoryExamples,
    hasFailedLoadingLogEntryCategoryExamples,
    isLoadingLogEntryCategoryExamples,
    logEntryCategoryExamples,
  } = useLogEntryCategoryExamples({
    categoryId,
    endTime: timeRange.endTime,
    exampleCount,
    sourceId,
    startTime: timeRange.startTime,
  });

  useEffect(() => {
    getLogEntryCategoryExamples();
  }, [getLogEntryCategoryExamples]);

  return (
    <CategoryExampleMessages>
      {isLoadingLogEntryCategoryExamples ? (
        <CategoryExampleMessagesLoadingIndicator exampleCount={exampleCount} />
      ) : hasFailedLoadingLogEntryCategoryExamples ? (
        <CategoryExampleMessagesFailureIndicator onRetry={getLogEntryCategoryExamples} />
      ) : logEntryCategoryExamples.length === 0 ? (
        <CategoryExampleMessagesEmptyIndicator onReload={getLogEntryCategoryExamples} />
      ) : (
        logEntryCategoryExamples.map((categoryExample, categoryExampleIndex) => (
          <CategoryExampleMessage
            dataset={categoryExample.dataset}
            key={categoryExampleIndex}
            message={categoryExample.message}
            timestamp={categoryExample.timestamp}
          />
        ))
      )}
    </CategoryExampleMessages>
  );
};

const CategoryExampleMessages = euiStyled.div`
  align-items: stretch;
  flex-direction: column;
  flex: 1 0 0%;
  overflow: hidden;
`;
