/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios from 'axios';
import chrome from 'ui/chrome';

import { BehaviorSubject } from 'rxjs';
import {
  ReindexOperation,
  ReindexStatus,
  ReindexStep,
  ReindexWarning,
} from '../../../../../../common/types';
import { LoadingState } from '../../../../types';

const POLL_INTERVAL = 1000;
const XSRF = chrome.getXsrfToken();

export const APIClient = axios.create({
  headers: {
    Accept: 'application/json',
    credentials: 'same-origin',
    'Content-Type': 'application/json',
    'kbn-version': XSRF,
    'kbn-xsrf': XSRF,
  },
});

export interface ReindexState {
  loadingState: LoadingState;
  lastCompletedStep?: ReindexStep;
  status?: ReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
  reindexWarnings?: ReindexWarning[];
}

interface StatusResponse {
  warnings?: ReindexWarning[];
  reindexOp?: ReindexOperation;
}

/**
 * Service used by the frontend to start reindexing and get updates on the state of a reindex
 * operation. Exposes an Observable that can be used to subscribe to state updates.
 */
export class ReindexPollingService {
  public status$: BehaviorSubject<ReindexState>;
  private pollTimeout?: NodeJS.Timeout;

  constructor(private indexName: string) {
    this.status$ = new BehaviorSubject<ReindexState>({
      loadingState: LoadingState.Loading,
      errorMessage: null,
      reindexTaskPercComplete: null,
    });
  }

  public updateStatus = async () => {
    // Prevent two loops from being started.
    this.stopPolling();

    try {
      const { data } = await APIClient.get<StatusResponse>(
        chrome.addBasePath(`/api/upgrade_assistant/reindex/${this.indexName}`)
      );
      this.updateWithResponse(data);

      // Only keep polling if it exists and is in progress.
      if (data.reindexOp && data.reindexOp.status === ReindexStatus.inProgress) {
        this.pollTimeout = setTimeout(this.updateStatus, POLL_INTERVAL);
      }
    } catch (e) {
      this.status$.next({
        ...this.status$.value,
        status: ReindexStatus.failed,
      });
    }
  };

  public stopPolling = () => {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
  };

  public startReindex = async () => {
    try {
      // Optimistically assume it will start, reset other state.
      const currentValue = this.status$.value;
      this.status$.next({
        ...currentValue,
        // Only reset last completed step if we aren't currently paused
        lastCompletedStep:
          currentValue.status === ReindexStatus.paused ? currentValue.lastCompletedStep : undefined,
        status: ReindexStatus.inProgress,
        reindexTaskPercComplete: null,
        errorMessage: null,
      });
      const { data } = await APIClient.post<ReindexOperation>(
        chrome.addBasePath(`/api/upgrade_assistant/reindex/${this.indexName}`)
      );

      this.updateWithResponse({ reindexOp: data });
      this.updateStatus();
    } catch (e) {
      this.status$.next({ ...this.status$.value, status: ReindexStatus.failed });
    }
  };

  private updateWithResponse = ({ reindexOp, warnings }: StatusResponse) => {
    // Next value should always include the entire state, not just what changes.
    // We make a shallow copy as a starting new state.
    const nextValue = {
      ...this.status$.value,
      // If we're getting any updates, set to success.
      loadingState: LoadingState.Success,
    };

    if (warnings) {
      nextValue.reindexWarnings = warnings;
    }

    if (reindexOp) {
      nextValue.lastCompletedStep = reindexOp.lastCompletedStep;
      nextValue.status = reindexOp.status;
      nextValue.reindexTaskPercComplete = reindexOp.reindexTaskPercComplete;
      nextValue.errorMessage = reindexOp.errorMessage;
    }

    this.status$.next(nextValue);
  };
}
