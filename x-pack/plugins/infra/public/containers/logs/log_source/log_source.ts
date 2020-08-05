/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useState, useMemo, useCallback } from 'react';
import { HttpSetup } from 'src/core/public';
import {
  LogSourceConfiguration,
  LogSourceStatus,
  LogSourceConfigurationPropertiesPatch,
  LogSourceConfigurationProperties,
} from '../../../../common/http_api/log_sources';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callFetchLogSourceConfigurationAPI } from './api/fetch_log_source_configuration';
import { callFetchLogSourceStatusAPI } from './api/fetch_log_source_status';
import { callPatchLogSourceConfigurationAPI } from './api/patch_log_source_configuration';

export {
  LogSourceConfiguration,
  LogSourceConfigurationProperties,
  LogSourceConfigurationPropertiesPatch,
  LogSourceStatus,
};

export const useLogSource = ({
  sourceId,
  fetch,
}: {
  sourceId: string;
  fetch: HttpSetup['fetch'];
}) => {
  const [sourceConfiguration, setSourceConfiguration] = useState<
    LogSourceConfiguration | undefined
  >(undefined);

  const [sourceStatus, setSourceStatus] = useState<LogSourceStatus | undefined>(undefined);

  const [loadSourceConfigurationRequest, loadSourceConfiguration] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callFetchLogSourceConfigurationAPI(sourceId, fetch);
      },
      onResolve: ({ data }) => {
        setSourceConfiguration(data);
      },
    },
    [sourceId, fetch]
  );

  const [updateSourceConfigurationRequest, updateSourceConfiguration] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (patchedProperties: LogSourceConfigurationPropertiesPatch) => {
        return await callPatchLogSourceConfigurationAPI(sourceId, patchedProperties, fetch);
      },
      onResolve: ({ data }) => {
        setSourceConfiguration(data);
        loadSourceStatus();
      },
    },
    [sourceId, fetch]
  );

  const [loadSourceStatusRequest, loadSourceStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callFetchLogSourceStatusAPI(sourceId, fetch);
      },
      onResolve: ({ data }) => {
        setSourceStatus(data);
      },
    },
    [sourceId, fetch]
  );

  const derivedIndexPattern = useMemo(
    () => ({
      fields: sourceStatus?.logIndexFields ?? [],
      title: sourceConfiguration?.configuration.name ?? 'unknown',
    }),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [sourceConfiguration, sourceStatus]
  );

  const isLoadingSourceConfiguration = useMemo(
    () => loadSourceConfigurationRequest.state === 'pending',
    [loadSourceConfigurationRequest.state]
  );

  const isUpdatingSourceConfiguration = useMemo(
    () => updateSourceConfigurationRequest.state === 'pending',
    [updateSourceConfigurationRequest.state]
  );

  const isLoadingSourceStatus = useMemo(() => loadSourceStatusRequest.state === 'pending', [
    loadSourceStatusRequest.state,
  ]);

  const isLoading = useMemo(
    () => isLoadingSourceConfiguration || isLoadingSourceStatus || isUpdatingSourceConfiguration,
    [isLoadingSourceConfiguration, isLoadingSourceStatus, isUpdatingSourceConfiguration]
  );

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

  const hasFailedLoadingSourceStatus = useMemo(() => loadSourceStatusRequest.state === 'rejected', [
    loadSourceStatusRequest.state,
  ]);

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
    hasFailedLoadingSourceStatus,
    initialize,
    isLoading,
    isLoadingSourceConfiguration,
    isLoadingSourceStatus,
    isUninitialized,
    loadSource,
    loadSourceFailureMessage,
    loadSourceConfiguration,
    loadSourceStatus,
    sourceConfiguration,
    sourceId,
    sourceStatus,
    updateSourceConfiguration,
  };
};

export const [LogSourceProvider, useLogSourceContext] = createContainer(useLogSource);
