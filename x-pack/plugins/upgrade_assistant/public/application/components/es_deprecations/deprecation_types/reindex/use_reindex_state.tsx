/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useState, useEffect } from 'react';

import {
  IndexGroup,
  ReindexOperation,
  ReindexStatus,
  ReindexStep,
  ReindexWarning,
} from '../../../../../../common/types';
import { LoadingState } from '../../../types';
import { ApiService } from '../../../../lib/api';

const POLL_INTERVAL = 1000;

export interface ReindexState {
  loadingState: LoadingState;
  cancelLoadingState?: LoadingState;
  lastCompletedStep?: ReindexStep;
  status?: ReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
  reindexWarnings?: ReindexWarning[];
  hasRequiredPrivileges?: boolean;
  indexGroup?: IndexGroup;
}

interface StatusResponse {
  warnings?: ReindexWarning[];
  reindexOp?: ReindexOperation;
  hasRequiredPrivileges?: boolean;
  indexGroup?: IndexGroup;
}

const getReindexState = (
  reindexState: ReindexState,
  { reindexOp, warnings, hasRequiredPrivileges, indexGroup }: StatusResponse
) => {
  const newReindexState = {
    ...reindexState,
    loadingState: LoadingState.Success,
  };

  if (warnings) {
    newReindexState.reindexWarnings = warnings;
  }

  if (hasRequiredPrivileges !== undefined) {
    newReindexState.hasRequiredPrivileges = hasRequiredPrivileges;
  }

  if (indexGroup) {
    newReindexState.indexGroup = indexGroup;
  }

  if (reindexOp) {
    // Prevent the UI flickering back to inProgress after cancelling
    newReindexState.lastCompletedStep = reindexOp.lastCompletedStep;
    newReindexState.status = reindexOp.status;
    newReindexState.reindexTaskPercComplete = reindexOp.reindexTaskPercComplete;
    newReindexState.errorMessage = reindexOp.errorMessage;

    if (reindexOp.status === ReindexStatus.cancelled) {
      newReindexState.cancelLoadingState = LoadingState.Success;
    }
  }

  return newReindexState;
};

export const useReindexStatus = ({ indexName, api }: { indexName: string; api: ApiService }) => {
  const [reindexState, setReindexState] = useState<ReindexState>({
    loadingState: LoadingState.Loading,
    errorMessage: null,
    reindexTaskPercComplete: null,
  });

  const pollIntervalIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }
  }, []);

  const updateStatus = useCallback(async () => {
    clearPollInterval();

    const { data, error } = await api.getReindexStatus(indexName);

    if (error) {
      setReindexState({
        ...reindexState,
        loadingState: LoadingState.Error,
        status: ReindexStatus.failed,
      });
      return;
    }

    setReindexState(getReindexState(reindexState, data));

    // Only keep polling if it exists and is in progress.
    if (data.reindexOp && data.reindexOp.status === ReindexStatus.inProgress) {
      pollIntervalIdRef.current = setTimeout(updateStatus, POLL_INTERVAL);
    }
  }, [clearPollInterval, api, indexName, reindexState]);

  const startReindex = useCallback(async () => {
    const currentReindexState = {
      ...reindexState,
    };

    setReindexState({
      ...currentReindexState,
      // Only reset last completed step if we aren't currently paused
      lastCompletedStep:
        currentReindexState.status === ReindexStatus.paused
          ? currentReindexState.lastCompletedStep
          : undefined,
      status: ReindexStatus.inProgress,
      reindexTaskPercComplete: null,
      errorMessage: null,
      cancelLoadingState: undefined,
    });

    api.sendReindexTelemetryData({ start: true });

    const { data, error } = await api.startReindexTask(indexName);

    if (error) {
      setReindexState({
        ...reindexState,
        loadingState: LoadingState.Error,
        status: ReindexStatus.failed,
      });
      return;
    }

    setReindexState(getReindexState(reindexState, data));
    updateStatus();
  }, [api, indexName, reindexState, updateStatus]);

  const cancelReindex = useCallback(async () => {
    api.sendReindexTelemetryData({ stop: true });

    const { error } = await api.cancelReindexTask(indexName);

    setReindexState({
      ...reindexState,
      cancelLoadingState: LoadingState.Loading,
    });

    if (error) {
      setReindexState({
        ...reindexState,
        cancelLoadingState: LoadingState.Error,
      });
      return;
    }
  }, [api, indexName, reindexState]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      // Clean up on unmount.
      clearPollInterval();
    };
  }, [clearPollInterval]);

  return {
    reindexState,
    startReindex,
    cancelReindex,
    updateStatus,
  };
};
