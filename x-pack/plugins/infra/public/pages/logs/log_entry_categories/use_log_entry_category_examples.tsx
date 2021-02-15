/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';

import { LogEntryCategoryExample } from '../../../../common/http_api';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callGetLogEntryCategoryExamplesAPI } from './service_calls/get_log_entry_category_examples';

export const useLogEntryCategoryExamples = ({
  categoryId,
  endTime,
  exampleCount,
  sourceId,
  startTime,
}: {
  categoryId: number;
  endTime: number;
  exampleCount: number;
  sourceId: string;
  startTime: number;
}) => {
  const { services } = useKibanaContextForPlugin();

  const [logEntryCategoryExamples, setLogEntryCategoryExamples] = useState<
    LogEntryCategoryExample[]
  >([]);

  const [getLogEntryCategoryExamplesRequest, getLogEntryCategoryExamples] = useTrackedPromise(
    {
      cancelPreviousOn: 'creation',
      createPromise: async () => {
        return await callGetLogEntryCategoryExamplesAPI(
          {
            sourceId,
            startTime,
            endTime,
            categoryId,
            exampleCount,
          },
          services.http.fetch
        );
      },
      onResolve: ({ data: { examples } }) => {
        setLogEntryCategoryExamples(examples);
      },
    },
    [categoryId, endTime, exampleCount, sourceId, startTime]
  );

  const isLoadingLogEntryCategoryExamples = useMemo(
    () => getLogEntryCategoryExamplesRequest.state === 'pending',
    [getLogEntryCategoryExamplesRequest.state]
  );

  const hasFailedLoadingLogEntryCategoryExamples = useMemo(
    () => getLogEntryCategoryExamplesRequest.state === 'rejected',
    [getLogEntryCategoryExamplesRequest.state]
  );

  return {
    getLogEntryCategoryExamples,
    hasFailedLoadingLogEntryCategoryExamples,
    isLoadingLogEntryCategoryExamples,
    logEntryCategoryExamples,
  };
};
