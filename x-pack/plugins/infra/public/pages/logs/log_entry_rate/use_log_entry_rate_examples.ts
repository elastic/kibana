/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';

import { LogEntryRateExample } from '../../../../common/http_api';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callGetLogEntryRateExamplesAPI } from './service_calls/get_log_entry_rate_examples';

export const useLogEntryRateExamples = ({
  dataset,
  endTime,
  exampleCount,
  sourceId,
  startTime,
}: {
  dataset: string;
  endTime: number;
  exampleCount: number;
  sourceId: string;
  startTime: number;
}) => {
  const [logEntryRateExamples, setLogEntryRateExamples] = useState<LogEntryRateExample[]>([]);

  const [getLogEntryRateExamplesRequest, getLogEntryRateExamples] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetLogEntryRateExamplesAPI(
          sourceId,
          startTime,
          endTime,
          dataset,
          exampleCount
        );
      },
      onResolve: ({ data: { examples } }) => {
        setLogEntryRateExamples(examples);
      },
    },
    [dataset, endTime, exampleCount, sourceId, startTime]
  );

  const isLoadingLogEntryRateExamples = useMemo(
    () => getLogEntryRateExamplesRequest.state === 'pending',
    [getLogEntryRateExamplesRequest.state]
  );

  const hasFailedLoadingLogEntryRateExamples = useMemo(
    () => getLogEntryRateExamplesRequest.state === 'rejected',
    [getLogEntryRateExamplesRequest.state]
  );

  return {
    getLogEntryRateExamples,
    hasFailedLoadingLogEntryRateExamples,
    isLoadingLogEntryRateExamples,
    logEntryRateExamples,
  };
};
