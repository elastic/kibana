/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useState, useEffect } from 'react';

import {
  ReindexOperation,
  ReindexStatus,
  ReindexStep,
  ReindexWarning,
} from '../../../../../../common/types';
import { CancelLoadingState, LoadingState } from '../../../types';
import { ApiService } from '../../../../lib/api';

const POLL_INTERVAL = 1000;

export interface ReindexState {
  loadingState: LoadingState;
  cancelLoadingState?: CancelLoadingState;
  lastCompletedStep?: ReindexStep;
  status?: ReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
  reindexWarnings?: ReindexWarning[];
  hasRequiredPrivileges?: boolean;
}

interface StatusResponse {
  warnings?: ReindexWarning[];
  reindexOp?: ReindexOperation;
  hasRequiredPrivileges?: boolean;
}

const getReindexState = (
  reindexState: ReindexState,
  { reindexOp, warnings, hasRequiredPrivileges }: StatusResponse
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

  if (reindexOp) {
    // Prevent the UI flickering back to inProgress after cancelling
    newReindexState.lastCompletedStep = reindexOp.lastCompletedStep;
    newReindexState.status = reindexOp.status;
    newReindexState.reindexTaskPercComplete = reindexOp.reindexTaskPercComplete;
    newReindexState.errorMessage = reindexOp.errorMessage;

    // if reindex cancellation was "requested" or "loading" and the reindex task is now cancelled,
    // then reindex cancellation has completed, set it to "success"
    if (
      (reindexState.cancelLoadingState === CancelLoadingState.Requested ||
        reindexState.cancelLoadingState === CancelLoadingState.Loading) &&
      reindexOp.status === ReindexStatus.cancelled
    ) {
      newReindexState.cancelLoadingState = CancelLoadingState.Success;
    } else if (
      // if reindex cancellation has been requested and the reindex task is still in progress,
      // then reindex cancellation has not completed yet, set it to "loading"
      reindexState.cancelLoadingState === CancelLoadingState.Requested &&
      reindexOp.status === ReindexStatus.inProgress
    ) {
      newReindexState.cancelLoadingState = CancelLoadingState.Loading;
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
      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          loadingState: LoadingState.Error,
          errorMessage: error.message.toString(),
          status: ReindexStatus.fetchFailed,
        };
      });
      return;
    }

    setReindexState((prevValue: ReindexState) => {
      return getReindexState(prevValue, data);
    });

    // Only keep polling if it exists and is in progress.
    if (data.reindexOp && data.reindexOp.status === ReindexStatus.inProgress) {
      pollIntervalIdRef.current = setTimeout(updateStatus, POLL_INTERVAL);
    }
  }, [clearPollInterval, api, indexName]);

  const startReindex = useCallback(async () => {
    setReindexState((prevValue: ReindexState) => {
      return {
        ...prevValue,
        // Only reset last completed step if we aren't currently paused
        lastCompletedStep:
          prevValue.status === ReindexStatus.paused ? prevValue.lastCompletedStep : undefined,
        status: ReindexStatus.inProgress,
        reindexTaskPercComplete: null,
        errorMessage: null,
        cancelLoadingState: undefined,
      };
    });

    const { data: reindexOp, error } = await api.startReindexTask(indexName);

    if (error) {
      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          loadingState: LoadingState.Error,
          errorMessage: error.message.toString(),
          status: ReindexStatus.failed,
        };
      });
      return;
    }

    setReindexState((prevValue: ReindexState) => {
      return getReindexState(prevValue, { reindexOp });
    });
    updateStatus();
  }, [api, indexName, updateStatus]);

  const cancelReindex = useCallback(async () => {
    setReindexState((prevValue: ReindexState) => {
      return {
        ...prevValue,
        cancelLoadingState: CancelLoadingState.Requested,
      };
    });

    const { error } = await api.cancelReindexTask(indexName);

    if (error) {
      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          cancelLoadingState: CancelLoadingState.Error,
        };
      });
      return;
    }
  }, [api, indexName]);

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
