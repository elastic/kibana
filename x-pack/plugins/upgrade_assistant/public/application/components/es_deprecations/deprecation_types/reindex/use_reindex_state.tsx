/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback, useState, useEffect } from 'react';

import {
  ReindexStatusResponse,
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
  meta: {
    indexName: string;
    reindexName: string;
    aliases: string[];
  };
}

const getReindexState = (
  reindexState: ReindexState,
  { reindexOp, warnings, hasRequiredPrivileges, meta: updatedMeta }: ReindexStatusResponse
) => {
  const meta = { ...(updatedMeta ?? reindexState.meta) };
  // Once we have received an array of existing aliases, we won't update the meta value anymore because
  // when we'll delete the original alias during the reindex process there won't be any aliases pointing
  // to it anymore and the last reindex step (Update existing aliases) would be suddenly removed.
  const aliases =
    reindexState.meta.aliases.length > 0 ? reindexState.meta.aliases : updatedMeta.aliases;
  const newReindexState = {
    ...reindexState,
    meta: { ...meta, aliases },
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

    let updateLastCompletedStep = true;
    if (
      reindexOp.lastCompletedStep === ReindexStep.aliasCreated &&
      reindexOp.status !== ReindexStatus.completed
    ) {
      // "ReindexStep.aliasCreated" is the last step coming from the server
      // There is a delay between the moment the server returns that the "lastCompletedStep"
      // is "aliasCreated" and when the server marks reindexing as "completed".
      // We will correct this timing error by only marking the "aliasCreated" step as done
      // when the reindex status is "completed".
      updateLastCompletedStep = false;
    }

    if (updateLastCompletedStep) {
      newReindexState.lastCompletedStep = reindexOp.lastCompletedStep;
    }
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
    } else if (newReindexState.status === ReindexStatus.completed) {
      // The Elasticsearch reindex is complete. We will add one or two (depending if there are
      // existing aliases that need to be updated) "fake" steps only for the UI.
      // This will help our users understand what actually happened in the last step.
      newReindexState.status = ReindexStatus.inProgress;
    }
  }

  return newReindexState;
};

export const useReindexStatus = ({ indexName, api }: { indexName: string; api: ApiService }) => {
  const [reindexState, setReindexState] = useState<ReindexState>({
    loadingState: LoadingState.Loading,
    errorMessage: null,
    reindexTaskPercComplete: null,
    meta: {
      indexName,
      reindexName: '', // will be known after fetching the reindexStatus
      aliases: [], // will be known after fetching the reindexStatus
    },
  });

  const pollIntervalIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(false);

  const clearPollInterval = useCallback(() => {
    if (pollIntervalIdRef.current) {
      clearTimeout(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }
  }, []);

  /**
   * When the server says that reindexing is complete we will fake
   * one (or two in case there are existing aliases to update) extra steps in the UI
   */
  const simulateExtraSteps = useCallback(() => {
    const delay = 1000;
    const hasExistingAliases = reindexState.meta.aliases.length > 0;

    // Mark "update existing aliases" as completed
    const completeUpdateExistingAliasesStep = () => {
      if (!isMounted.current) {
        return;
      }

      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          status: ReindexStatus.completed,
          lastCompletedStep: ReindexStep.existingAliasesUpdated,
        };
      });
    };

    // Mark "original index deleted" as completed
    const completeDeleteOriginalIndexStep = () => {
      if (!isMounted.current) {
        return;
      }

      setReindexState((prevValue: ReindexState) => {
        return {
          ...prevValue,
          status: hasExistingAliases ? ReindexStatus.inProgress : ReindexStatus.completed,
          lastCompletedStep: ReindexStep.originalIndexDeleted,
        };
      });

      if (hasExistingAliases) {
        // Still one step to go!
        setTimeout(completeUpdateExistingAliasesStep, delay);
      }
    };

    setTimeout(completeDeleteOriginalIndexStep, delay);
  }, [reindexState.meta.aliases.length]);

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

    if (data === null) {
      return;
    }

    setReindexState((prevValue: ReindexState) => {
      return getReindexState(prevValue, data);
    });

    if (data.reindexOp && data.reindexOp.status === ReindexStatus.inProgress) {
      // Only keep polling if it exists and is in progress.
      pollIntervalIdRef.current = setTimeout(updateStatus, POLL_INTERVAL);
    } else if (data.reindexOp && data.reindexOp.status === ReindexStatus.completed) {
      simulateExtraSteps();
    }
  }, [clearPollInterval, api, indexName, simulateExtraSteps]);

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
      return getReindexState(prevValue, { reindexOp, meta: prevValue.meta });
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
    updateStatus();
  }, [updateStatus]);

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
