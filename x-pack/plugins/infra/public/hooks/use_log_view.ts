/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInterpret, useSelector } from '@xstate/react';
import createContainer from 'constate';
import { useCallback, useEffect, useState } from 'react';
import { waitFor } from 'xstate/lib/waitFor';
import { LogViewAttributes } from '../../common/log_views';
import {
  createLogViewNotificationChannel,
  createLogViewStateMachine,
} from '../observability_logs/log_view_state';
import type { ILogViewsClient } from '../services/log_views';
import { isDevMode } from '../utils/dev_mode';

export const useLogView = ({
  logViewId,
  logViews,
  useDevTools = isDevMode(),
}: {
  logViewId: string;
  logViews: ILogViewsClient;
  useDevTools?: boolean;
}) => {
  const [logViewStateNotifications] = useState(() => createLogViewNotificationChannel());

  const logViewStateService = useInterpret(
    () =>
      createLogViewStateMachine({
        initialContext: {
          logViewId,
        },
        logViews,
        notificationChannel: logViewStateNotifications,
      }),
    {
      devTools: useDevTools,
    }
  );

  useEffect(() => {
    logViewStateService.send({
      type: 'LOG_VIEW_ID_CHANGED',
      logViewId,
    });
  }, [logViewId, logViewStateService]);

  const logView = useSelector(logViewStateService, (state) =>
    state.matches('resolving') || state.matches('checkingStatus') || state.matches('resolved')
      ? state.context.logView
      : undefined
  );

  const resolvedLogView = useSelector(logViewStateService, (state) =>
    state.matches('checkingStatus') || state.matches('resolved')
      ? state.context.resolvedLogView
      : undefined
  );

  const logViewStatus = useSelector(logViewStateService, (state) =>
    state.matches('resolved') ? state.context.status : undefined
  );

  const isLoadingLogView = useSelector(logViewStateService, (state) => state.matches('loading'));
  const isResolvingLogView = useSelector(logViewStateService, (state) =>
    state.matches('resolving')
  );
  const isLoadingLogViewStatus = useSelector(logViewStateService, (state) =>
    state.matches('checkingStatus')
  );
  const isUpdatingLogView = useSelector(logViewStateService, (state) => state.matches('updating'));

  const isLoading =
    isLoadingLogView || isResolvingLogView || isLoadingLogViewStatus || isUpdatingLogView;

  const isUninitialized = useSelector(logViewStateService, (state) =>
    state.matches('uninitialized')
  );

  const hasFailedLoadingLogView = useSelector(logViewStateService, (state) =>
    state.matches('loadingFailed')
  );
  const hasFailedResolvingLogView = useSelector(logViewStateService, (state) =>
    state.matches('resolutionFailed')
  );
  const hasFailedLoadingLogViewStatus = useSelector(logViewStateService, (state) =>
    state.matches('checkingStatusFailed')
  );

  const latestLoadLogViewFailures = useSelector(logViewStateService, (state) =>
    state.matches('loadingFailed') ||
    state.matches('resolutionFailed') ||
    state.matches('checkingStatusFailed')
      ? [state.context.error]
      : []
  );

  const hasFailedLoading = latestLoadLogViewFailures.length > 0;

  const retry = useCallback(
    () =>
      logViewStateService.send({
        type: 'RETRY',
      }),
    [logViewStateService]
  );

  const update = useCallback(
    async (logViewAttributes: Partial<LogViewAttributes>) => {
      logViewStateService.send({
        type: 'UPDATE',
        attributes: logViewAttributes,
      });

      const doneState = await waitFor(
        logViewStateService,
        (state) => state.matches('updatingFailed') || state.matches('resolved')
      );

      if (doneState.matches('updatingFailed')) {
        throw doneState.context.error;
      }
    },
    [logViewStateService]
  );

  return {
    // underlying state machine
    logViewStateService,
    logViewStateNotifications,

    // Failure states
    hasFailedLoading,
    hasFailedLoadingLogView,
    hasFailedLoadingLogViewStatus,
    hasFailedResolvingLogView,
    latestLoadLogViewFailures,

    // Loading states
    isUninitialized,
    isLoading,
    isLoadingLogView,
    isLoadingLogViewStatus,
    isResolvingLogView,

    // data
    logViewId,
    logView,
    resolvedLogView,
    logViewStatus,
    derivedDataView: resolvedLogView?.dataViewReference,

    // actions
    load: retry,
    retry,
    update,
  };
};

export const [LogViewProvider, useLogViewContext] = createContainer(useLogView);
