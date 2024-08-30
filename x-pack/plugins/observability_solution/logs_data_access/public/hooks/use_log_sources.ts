/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useTrackedPromise } from '@kbn/use-tracked-promise';
import { useState, useEffect, useMemo } from 'react';
import { LogSource, LogSourcesService } from '../../common/services/log_sources_service/types';

export const useLogSources = ({ logSourcesService }: { logSourcesService: LogSourcesService }) => {
  const [logSources, setLogSources] = useState<LogSource[]>([]);
  const [logSourcesError, setLogSourcesError] = useState<Error | undefined>(undefined);
  const [requestState, getLogSources] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await logSourcesService.getLogSources();
      },
      onResolve: (response) => {
        setLogSources(response);
        setLogSourcesError(undefined);
      },
      onReject: (response) => {
        setLogSourcesError(response as Error);
      },
    },
    []
  );

  useEffect(() => {
    getLogSources();
  }, [getLogSources]);

  const combinedIndices = useMemo(() => {
    return logSources.map((logSource) => logSource.indexPattern).join(',');
  }, [logSources]);

  return {
    isUninitialized: requestState.state === 'uninitialized',
    isLoadingLogSources: requestState.state === 'pending',
    hasFailedLoadingLogSources: logSourcesError !== undefined,
    logSourcesError,
    logSources,
    combinedIndices,
  };
};

export const [LogSourcesProvider, useLogSourcesContext] = createContainer(useLogSources);
