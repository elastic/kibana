/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useMemo, useState } from 'react';
import type { HttpHandler } from 'src/core/public';
import { LogSourceStatus } from '../../common/http_api/log_sources';
import { LogView, LogViewAttributes, ResolvedLogView } from '../../common/log_views';
import { callFetchLogSourceStatusAPI } from '../containers/logs/log_source/api/fetch_log_source_status';
import type { ILogViewsClient } from '../services/log_views';
import { isRejectedPromiseState, useTrackedPromise } from '../utils/use_tracked_promise';

export const useLogView = ({
  logViewId,
  logViews,
  fetch,
}: {
  logViewId: string;
  logViews: ILogViewsClient;
  fetch: HttpHandler;
}) => {
  const [logView, setLogView] = useState<LogView | undefined>(undefined);

  const [resolvedLogView, setResolvedLogView] = useState<ResolvedLogView | undefined>(undefined);

  const [sourceStatus, setSourceStatus] = useState<LogSourceStatus | undefined>(undefined);

  const [loadLogViewRequest, loadLogView] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await logViews.getLogView(logViewId);
      },
      onResolve: setLogView,
    },
    [logViewId, logViews.getLogView]
  );

  const [resolveLogViewRequest, resolveLogView] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (logViewAttributes: LogViewAttributes) => {
        return await logViews.resolveLogView(logViewAttributes);
      },
      onResolve: setResolvedLogView,
    },
    [logViews.resolveLogView]
  );

  const [updateLogViewRequest, updateLogView] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (logViewAttributes: Partial<LogViewAttributes>) => {
        return await logViews.putLogView(logViewId, logViewAttributes);
      },
      onResolve: setLogView,
    },
    [logViewId, logViews.putLogView]
  );

  const [loadLogViewStatusRequest, loadLogViewStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callFetchLogSourceStatusAPI(logViewId, fetch);
      },
      onResolve: ({ data }) => setSourceStatus(data),
    },
    [logViewId, fetch]
  );

  const derivedDataView = useMemo(
    () => ({
      fields: resolvedLogView?.fields ?? [],
      title: resolvedLogView?.indices ?? 'unknown',
    }),
    [resolvedLogView]
  );

  const isLoadingLogView = loadLogViewRequest.state === 'pending';
  const isResolvingLogView = resolveLogViewRequest.state === 'pending';
  const isLoadingLogViewStatus = loadLogViewStatusRequest.state === 'pending';
  const isUpdatingLogView = updateLogViewRequest.state === 'pending';

  const isLoading =
    isLoadingLogView || isResolvingLogView || isLoadingLogViewStatus || isUpdatingLogView;

  const isUninitialized =
    loadLogViewRequest.state === 'uninitialized' ||
    resolveLogViewRequest.state === 'uninitialized' ||
    loadLogViewStatusRequest.state === 'uninitialized';

  const hasFailedLoadingSource = loadLogViewRequest.state === 'rejected';
  const hasFailedResolvingSource = resolveLogViewRequest.state === 'rejected';
  const hasFailedLoadingSourceStatus = loadLogViewStatusRequest.state === 'rejected';

  const latestLoadSourceFailures = [
    loadLogViewRequest,
    resolveLogViewRequest,
    loadLogViewStatusRequest,
  ]
    .filter(isRejectedPromiseState)
    .map(({ value }) => (value instanceof Error ? value : new Error(`${value}`)));

  const hasFailedLoading = latestLoadSourceFailures.length > 0;

  const load = useCallback(async () => {
    const loadedLogView = await loadLogView();
    const resolvedLoadedLogView = await resolveLogView(loadedLogView.attributes);
    const loadedLogViewStatus = await loadLogViewStatus();

    return [loadedLogView, resolvedLoadedLogView, loadedLogViewStatus];
  }, [loadLogView, loadLogViewStatus, resolveLogView]);

  // const updateSource = useCallback(
  //   async (patchedProperties: LogSourceConfigurationPropertiesPatch) => {
  //     const updatedSourceConfiguration = await updateLogView(patchedProperties);
  //     const resolveSourceConfigurationPromise = resolveLogView(
  //       updatedSourceConfiguration.configuration
  //     );
  //     const loadSourceStatusPromise = loadLogViewStatus();

  //     return await Promise.all([
  //       updatedSourceConfiguration,
  //       resolveSourceConfigurationPromise,
  //       loadSourceStatusPromise,
  //     ]);
  //   },
  //   [loadLogViewStatus, resolveLogView, updateLogView]
  // );

  // const initialize = useCallback(async () => {
  //   if (!isUninitialized) {
  //     return;
  //   }

  //   return await load();
  // }, [isUninitialized, load]);

  // return {
  //   sourceId: logViewId,
  //   initialize,
  //   isUninitialized,
  //   derivedIndexPattern: derivedDataView,
  //   // Failure states
  //   hasFailedLoading,
  //   hasFailedLoadingSource,
  //   hasFailedLoadingSourceStatus,
  //   hasFailedResolvingSource,
  //   latestLoadSourceFailures,
  //   // Loading states
  //   isLoading,
  //   isLoadingSourceConfiguration: isLoadingLogView,
  //   isLoadingSourceStatus: isLoadingLogViewStatus,
  //   isResolvingSourceConfiguration: isResolvingLogView,
  //   // Source status (denotes the state of the indices, e.g. missing)
  //   sourceStatus,
  //   loadSourceStatus: loadLogViewStatus,
  //   // Source configuration (represents the raw attributes of the source configuration)
  //   loadSource: load,
  //   sourceConfiguration,
  //   updateSource,
  //   // Resolved source configuration (represents a fully resolved state, you would use this for the vast majority of "read" scenarios)
  //   resolvedSourceConfiguration,
  // };
};

export const [LogViewProvider, useLogViewContext] = createContainer(useLogView);
