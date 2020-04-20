/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useState, useMemo, useCallback } from 'react';
import { LogSourceConfiguration, LogSourceStatus } from '../../../../common/http_api/log_sources';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callFetchLogSourceConfigurationAPI } from './api/fetch_log_source_configuration';
import { callFetchLogSourceStatusAPI } from './api/fetch_log_source_status';

export const useLogSource = ({ sourceId }: { sourceId: string }) => {
  const [sourceConfiguration, setSourceConfiguration] = useState<
    LogSourceConfiguration | undefined
  >(undefined);

  const [sourceStatus, setSourceStatus] = useState<LogSourceStatus | undefined>(undefined);

  const [loadSourceConfigurationRequest, loadSourceConfiguration] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callFetchLogSourceConfigurationAPI(sourceId);
      },
      onResolve: ({ data }) => {
        setSourceConfiguration(data);
      },
    },
    [sourceId]
  );

  const [loadSourceStatusRequest, loadSourceStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callFetchLogSourceStatusAPI(sourceId);
      },
      onResolve: ({ data }) => {
        setSourceStatus(data);
      },
    },
    [sourceId]
  );

  const logIndicesExist = useMemo(() => (sourceStatus?.logIndexNames?.length ?? 0) > 0, [
    sourceStatus,
  ]);

  const derivedIndexPattern = useMemo(
    () => ({
      fields: sourceStatus?.logIndexFields ?? [],
      title: sourceConfiguration?.configuration.name ?? 'unknown',
    }),
    [sourceConfiguration, sourceStatus]
  );

  const isLoadingSourceConfiguration = useMemo(
    () => loadSourceConfigurationRequest.state === 'pending',
    [loadSourceConfigurationRequest.state]
  );

  const isLoadingSourceStatus = useMemo(() => loadSourceStatusRequest.state === 'pending', [
    loadSourceStatusRequest.state,
  ]);

  const isLoading = useMemo(() => isLoadingSourceConfiguration || isLoadingSourceStatus, [
    isLoadingSourceConfiguration,
    isLoadingSourceStatus,
  ]);

  const isUninitialized = useMemo(
    () =>
      loadSourceConfigurationRequest.state === 'uninitialized' ||
      loadSourceStatusRequest.state === 'uninitialized',
    [loadSourceConfigurationRequest.state, loadSourceStatusRequest.state]
  );

  const hasFailedLoadingSource = useMemo(
    () => loadSourceConfigurationRequest.state === 'rejected',
    [loadSourceConfigurationRequest.state]
  );

  const loadSourceFailureMessage = useMemo(
    () =>
      loadSourceConfigurationRequest.state === 'rejected'
        ? `${loadSourceConfigurationRequest.value}`
        : undefined,
    [loadSourceConfigurationRequest]
  );

  const loadSource = useCallback(() => {
    return Promise.all([loadSourceConfiguration(), loadSourceStatus()]);
  }, [loadSourceConfiguration, loadSourceStatus]);

  const initialize = useCallback(async () => {
    if (!isUninitialized) {
      return;
    }

    return await loadSource();
  }, [isUninitialized, loadSource]);

  return {
    derivedIndexPattern,
    hasFailedLoadingSource,
    initialize,
    isLoading,
    isLoadingSourceConfiguration,
    isLoadingSourceStatus,
    isUninitialized,
    loadSource,
    loadSourceFailureMessage,
    loadSourceConfiguration,
    loadSourceStatus,
    logIndicesExist,
    sourceConfiguration,
    sourceId,
    sourceStatus,
    updateSourceConfiguration: (..._args: any[]) => undefined,
  };
};

export const [LogSourceProvider, useLogSourceContext] = createContainer(useLogSource);
