/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import { PersistedLogViewReference } from '@kbn/logs-shared-plugin/common';

import { LogEntryExample } from '../../../../common/log_analysis';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callGetLogEntryExamplesAPI } from './service_calls/get_log_entry_examples';

export const useLogEntryExamples = ({
  dataset,
  endTime,
  exampleCount,
  logViewReference,
  startTime,
  categoryId,
}: {
  dataset: string;
  endTime: number;
  exampleCount: number;
  logViewReference: PersistedLogViewReference;
  startTime: number;
  categoryId?: string;
}) => {
  const { services } = useKibanaContextForPlugin();
  const [logEntryExamples, setLogEntryExamples] = useState<LogEntryExample[]>([]);

  const [getLogEntryExamplesRequest, getLogEntryExamples] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetLogEntryExamplesAPI(
          {
            logViewReference,
            startTime,
            endTime,
            dataset,
            exampleCount,
            categoryId,
          },
          services.http.fetch
        );
      },
      onResolve: ({ data: { examples } }) => {
        setLogEntryExamples(examples);
      },
    },
    [dataset, endTime, exampleCount, logViewReference, startTime]
  );

  const isLoadingLogEntryExamples = useMemo(
    () => getLogEntryExamplesRequest.state === 'pending',
    [getLogEntryExamplesRequest.state]
  );

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
