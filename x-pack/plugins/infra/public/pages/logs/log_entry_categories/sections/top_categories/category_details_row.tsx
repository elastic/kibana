/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useLogEntryCategoryExamples } from '../../use_log_entry_category_examples';
import { LogEntryExampleMessages } from '../../../../../components/logging/log_entry_examples/log_entry_examples';
import { TimeRange } from '../../../../../../common/http_api/shared';

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
    <LogEntryExampleMessages
      isLoading={isLoadingLogEntryCategoryExamples}
      hasFailedLoading={hasFailedLoadingLogEntryCategoryExamples}
      examples={logEntryCategoryExamples}
      exampleCount={exampleCount}
      onReload={getLogEntryCategoryExamples}
    />
  );
};
