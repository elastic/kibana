/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import type { HttpHandler } from 'src/core/public';
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
} from '../../../../common/log_sources';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callFetchLogSourceConfigurationAPI } from './api/fetch_log_source_configuration';
import { callFetchLogSourceStatusAPI } from './api/fetch_log_source_status';
import { callPatchLogSourceConfigurationAPI } from './api/patch_log_source_configuration';
import { IndexPatternsContract } from '../../../../../../../src/plugins/data/common';

export {
  LogIndexField,
  LogSourceConfiguration,
  LogSourceConfigurationProperties,
  LogSourceConfigurationPropertiesPatch,
  LogSourceStatus,
};

export const useLogSource = ({
  sourceId,
  fetch,
  indexPatternsService,
}: {
  sourceId: string;
  fetch: HttpHandler;
  indexPatternsService: IndexPatternsContract;
}) => {
  const getIsMounted = useMountedState();
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
        const { data: sourceConfigurationResponse } = await callFetchLogSourceConfigurationAPI(
          sourceId,
          fetch
        );
        const resolvedSourceConfigurationResponse = await resolveLogSourceConfiguration(
          sourceConfigurationResponse?.configuration,
          indexPatternsService
        );
        return { sourceConfigurationResponse, resolvedSourceConfigurationResponse };
      },
      onResolve: ({ sourceConfigurationResponse, resolvedSourceConfigurationResponse }) => {
        if (!getIsMounted()) {
          return;
        }

        setSourceConfiguration(sourceConfigurationResponse);
        setResolvedSourceConfiguration(resolvedSourceConfigurationResponse);
      },
    },
    [sourceId, fetch, indexPatternsService]
  );

  const [updateSourceConfigurationRequest, updateSourceConfiguration] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (patchedProperties: LogSourceConfigurationPropertiesPatch) => {
        const { data: updatedSourceConfig } = await callPatchLogSourceConfigurationAPI(
          sourceId,
          patchedProperties,
          fetch
        );
        const resolvedSourceConfig = await resolveLogSourceConfiguration(
          updatedSourceConfig.configuration,
          indexPatternsService
        );
        return { updatedSourceConfig, resolvedSourceConfig };
      },
      onResolve: ({ updatedSourceConfig, resolvedSourceConfig }) => {
        if (!getIsMounted()) {
          return;
        }

        setSourceConfiguration(updatedSourceConfig);
        setResolvedSourceConfiguration(resolvedSourceConfig);
        loadSourceStatus();
      },
    },
    [sourceId, fetch, indexPatternsService]
  );

  const [loadSourceStatusRequest, loadSourceStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callFetchLogSourceStatusAPI(sourceId, fetch);
      },
      onResolve: ({ data }) => {
        if (!getIsMounted()) {
          return;
        }

        setSourceStatus(data);
      },
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
    sourceId,
    initialize,
    isUninitialized,
    derivedIndexPattern,
    // Failure states
    hasFailedLoadingSource,
    hasFailedLoadingSourceStatus,
    loadSourceFailureMessage,
    // Loading states
    isLoading,
    isLoadingSourceConfiguration,
    isLoadingSourceStatus,
    // Source status (denotes the state of the indices, e.g. missing)
    sourceStatus,
    loadSourceStatus,
    // Source configuration (represents the raw attributes of the source configuration)
    loadSource,
    loadSourceConfiguration,
    sourceConfiguration,
    updateSourceConfiguration,
    // Resolved source configuration (represents a fully resolved state, you would use this for the vast majority of "read" scenarios)
    resolvedSourceConfiguration,
  };
};

export const [LogSourceProvider, useLogSourceContext] = createContainer(useLogSource);
