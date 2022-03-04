/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useCallback, useMemo, useState } from 'react';
import type { HttpHandler } from 'src/core/public';
import { LogView, LogViewAttributes, LogViewStatus, ResolvedLogView } from '../../common/log_views';
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

  const [logViewStatus, setLogViewStatus] = useState<LogViewStatus | undefined>(undefined);

  const [loadLogViewRequest, loadLogView] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (logViewId_) => {
        return await logViews.getLogView(logViewId_);
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
      createPromise: async (logViewId_: string, logViewAttributes: Partial<LogViewAttributes>) => {
        return await logViews.putLogView(logViewId_, logViewAttributes);
      },
      onResolve: setLogView,
    },
    [logViewId, logViews.putLogView]
  );

  const [loadLogViewStatusRequest, loadLogViewStatus] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async (resolvedLogViewToCheck) => {
        return await logViews.getResolvedLogViewStatus(resolvedLogViewToCheck);
      },
      onResolve: setLogViewStatus,
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
    const loadedLogView = await loadLogView(logViewId);
    const resolvedLoadedLogView = await resolveLogView(loadedLogView.attributes);
    const resolvedLogViewStatus = await loadLogViewStatus(resolvedLoadedLogView);

    return [loadedLogView, resolvedLoadedLogView, resolvedLogViewStatus];
  }, [logViewId, loadLogView, loadLogViewStatus, resolveLogView]);

  const update = useCallback(
    async (logViewAttributes: Partial<LogViewAttributes>) => {
      const updatedLogView = await updateLogView(logViewId, logViewAttributes);
      const resolvedUpdatedLogView = await resolveLogView(updatedLogView.attributes);
      const resolvedLogViewStatus = await loadLogViewStatus(resolvedUpdatedLogView);

      return [updatedLogView, resolvedUpdatedLogView, resolvedLogViewStatus];
    },
    [logViewId, loadLogViewStatus, resolveLogView, updateLogView]
  );

  const initialize = useCallback(async () => {
    if (!isUninitialized) {
      return;
    }

    return await load();
  }, [isUninitialized, load]);

  return {
    logViewId,
    isUninitialized,
    derivedDataView,

    // Failure states
    hasFailedLoading,
    hasFailedLoadingSource,
    hasFailedLoadingSourceStatus,
    hasFailedResolvingSource,
    latestLoadSourceFailures,

    // Loading states
    isLoading,
    isLoadingLogView,
    isLoadingLogViewStatus,
    isResolvingLogView,

    // data
    logView,
    resolvedLogView,
    logViewStatus,

    // actions
    initialize,
    load,
    update,
  };
};

export const [LogViewProvider, useLogViewContext] = createContainer(useLogView);
