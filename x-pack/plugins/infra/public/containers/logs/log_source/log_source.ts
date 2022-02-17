/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useMemo, useState } from 'react';
import type { HttpHandler } from 'src/core/public';
import { DataViewsContract } from '../../../../../../../src/plugins/data_views/public';
import {
  LogIndexField,
  LogSourceConfigurationPropertiesPatch,
  LogSourceStatus,
} from '../../../../common/http_api/log_sources';
import {
  LogSourceConfiguration,
  LogSourceConfigurationProperties,
  ResolvedLogSourceConfiguration,
  resolveLogSourceConfiguration,
  ResolveLogSourceConfigurationError,
} from '../../../../common/log_sources';
import { isRejectedPromiseState, useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callFetchLogSourceConfigurationAPI } from './api/fetch_log_source_configuration';
import { callFetchLogSourceStatusAPI } from './api/fetch_log_source_status';
import { callPatchLogSourceConfigurationAPI } from './api/patch_log_source_configuration';

export type {
  LogIndexField,
  LogSourceConfiguration,
  LogSourceConfigurationProperties,
  LogSourceConfigurationPropertiesPatch,
  LogSourceStatus,
};
export { ResolveLogSourceConfigurationError };

export const useLogSource = ({
  sourceId,
  fetch,
  indexPatternsService,
}: {
  sourceId: string;
  fetch: HttpHandler;
  indexPatternsService: DataViewsContract;
}) => {
  const [sourceConfiguration, setSourceConfiguration] = useState<
    LogSourceConfiguration | undefined
  >(undefined);

  const [resolvedSourceConfiguration, setResolvedSourceConfiguration] = useState<
    ResolvedLogSourceConfiguration | undefined
  >(undefined);

  const [sourceStatus, setSourceStatus] = useState<LogSourceStatus | undefined>(undefined);

  const [loadSourceConfigurationRequest, loadSourceConfiguration] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return (await callFetchLogSourceConfigurationAPI(sourceId, fetch)).data;
      },
      onResolve: setSourceConfiguration,
    },
    [sourceId, fetch, indexPatternsService]
  );

  const [resolveSourceConfigurationRequest, resolveSourceConfiguration] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (unresolvedSourceConfiguration: LogSourceConfigurationProperties) => {
        return await resolveLogSourceConfiguration(
          unresolvedSourceConfiguration,
          indexPatternsService
        );
      },
      onResolve: setResolvedSourceConfiguration,
    },
    [indexPatternsService]
  );

  const [updateSourceConfigurationRequest, updateSourceConfiguration] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (patchedProperties: LogSourceConfigurationPropertiesPatch) => {
        return (await callPatchLogSourceConfigurationAPI(sourceId, patchedProperties, fetch)).data;
      },
      onResolve: setSourceConfiguration,
    },
    [sourceId, fetch, indexPatternsService]
  );

  const [loadSourceStatusRequest, loadSourceStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callFetchLogSourceStatusAPI(sourceId, fetch);
      },
      onResolve: ({ data }) => setSourceStatus(data),
    },
    [sourceId, fetch]
  );

  const derivedIndexPattern = useMemo(
    () => ({
      fields: resolvedSourceConfiguration?.fields ?? [],
      title: resolvedSourceConfiguration?.indices ?? 'unknown',
    }),
    [resolvedSourceConfiguration]
  );

  const isLoadingSourceConfiguration = loadSourceConfigurationRequest.state === 'pending';
  const isResolvingSourceConfiguration = resolveSourceConfigurationRequest.state === 'pending';
  const isLoadingSourceStatus = loadSourceStatusRequest.state === 'pending';
  const isUpdatingSourceConfiguration = updateSourceConfigurationRequest.state === 'pending';

  const isLoading =
    isLoadingSourceConfiguration ||
    isResolvingSourceConfiguration ||
    isLoadingSourceStatus ||
    isUpdatingSourceConfiguration;

  const isUninitialized =
    loadSourceConfigurationRequest.state === 'uninitialized' ||
    resolveSourceConfigurationRequest.state === 'uninitialized' ||
    loadSourceStatusRequest.state === 'uninitialized';

  const hasFailedLoadingSource = loadSourceConfigurationRequest.state === 'rejected';
  const hasFailedResolvingSource = resolveSourceConfigurationRequest.state === 'rejected';
  const hasFailedLoadingSourceStatus = loadSourceStatusRequest.state === 'rejected';

  const latestLoadSourceFailures = [
    loadSourceConfigurationRequest,
    resolveSourceConfigurationRequest,
    loadSourceStatusRequest,
  ]
    .filter(isRejectedPromiseState)
    .map(({ value }) => (value instanceof Error ? value : new Error(`${value}`)));

  const hasFailedLoading = latestLoadSourceFailures.length > 0;

  const loadSource = useCallback(async () => {
    const loadSourceConfigurationPromise = loadSourceConfiguration();
    const loadSourceStatusPromise = loadSourceStatus();
    const resolveSourceConfigurationPromise = resolveSourceConfiguration(
      (await loadSourceConfigurationPromise).configuration
    );

    return await Promise.all([
      loadSourceConfigurationPromise,
      resolveSourceConfigurationPromise,
      loadSourceStatusPromise,
    ]);
  }, [loadSourceConfiguration, loadSourceStatus, resolveSourceConfiguration]);

  const updateSource = useCallback(
    async (patchedProperties: LogSourceConfigurationPropertiesPatch) => {
      const updatedSourceConfiguration = await updateSourceConfiguration(patchedProperties);
      const resolveSourceConfigurationPromise = resolveSourceConfiguration(
        updatedSourceConfiguration.configuration
      );
      const loadSourceStatusPromise = loadSourceStatus();

      return await Promise.all([
        updatedSourceConfiguration,
        resolveSourceConfigurationPromise,
        loadSourceStatusPromise,
      ]);
    },
    [loadSourceStatus, resolveSourceConfiguration, updateSourceConfiguration]
  );

  const initialize = useCallback(async () => {
    if (!isUninitialized) {
      return;
    }

    return await loadSource();
  }, [isUninitialized, loadSource]);

  return {
    sourceId,
    initialize,
    isUninitialized,
    derivedIndexPattern,
    // Failure states
    hasFailedLoading,
    hasFailedLoadingSource,
    hasFailedLoadingSourceStatus,
    hasFailedResolvingSource,
    latestLoadSourceFailures,
    // Loading states
    isLoading,
    isLoadingSourceConfiguration,
    isLoadingSourceStatus,
    isResolvingSourceConfiguration,
    // Source status (denotes the state of the indices, e.g. missing)
    sourceStatus,
    loadSourceStatus,
    // Source configuration (represents the raw attributes of the source configuration)
    loadSource,
    sourceConfiguration,
    updateSource,
    // Resolved source configuration (represents a fully resolved state, you would use this for the vast majority of "read" scenarios)
    resolvedSourceConfiguration,
  };
};

export const [LogSourceProvider, useLogSourceContext] = createContainer(useLogSource);
