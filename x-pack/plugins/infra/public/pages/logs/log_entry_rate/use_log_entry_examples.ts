/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';

import { LogEntryExample } from '../../../../common/http_api';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callGetLogEntryExamplesAPI } from './service_calls/get_log_entry_examples';

export const useLogEntryExamples = ({
  dataset,
  endTime,
  exampleCount,
  sourceId,
  startTime,
  categoryId,
}: {
  dataset: string;
  endTime: number;
  exampleCount: number;
  sourceId: string;
  startTime: number;
  categoryId?: string;
}) => {
  const [logEntryExamples, setLogEntryExamples] = useState<LogEntryExample[]>([]);

  const [getLogEntryExamplesRequest, getLogEntryExamples] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetLogEntryExamplesAPI(
          sourceId,
          startTime,
          endTime,
          dataset,
          exampleCount,
          categoryId
        );
      },
      onResolve: ({ data: { examples } }) => {
        setLogEntryExamples(examples);
      },
    },
    [dataset, endTime, exampleCount, sourceId, startTime]
  );

  const isLoadingLogEntryExamples = useMemo(() => getLogEntryExamplesRequest.state === 'pending', [
    getLogEntryExamplesRequest.state,
  ]);

  const hasFailedLoadingLogEntryExamples = useMemo(
    () => getLogEntryExamplesRequest.state === 'rejected',
    [getLogEntryExamplesRequest.state]
  );

  return {
    getLogEntryExamples,
    hasFailedLoadingLogEntryExamples,
    isLoadingLogEntryExamples,
    logEntryExamples,
  };
};
