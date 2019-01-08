/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import axios from 'axios';
import chrome from 'ui/chrome';

import { BehaviorSubject } from 'rxjs';
import { ReindexOperation, ReindexStatus, ReindexStep } from '../../../../../../common/types';
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
    this.updateStatus();
  }

  public startReindex = async () => {
    try {
      // Optimistically assume it will start, reset other state.
      this.status$.next({
        ...this.status$.value,
        lastCompletedStep: undefined,
        status: ReindexStatus.inProgress,
        reindexTaskPercComplete: null,
        errorMessage: null,
      });
      const { data } = await APIClient.post<ReindexOperation>(
        chrome.addBasePath(`/api/upgrade_assistant/reindex/${this.indexName}`)
      );

      this.updateWithReindexOp(data);
      this.updateStatus();
    } catch (e) {
      this.status$.next({ ...this.status$.value, status: ReindexStatus.failed });
    }
  };

  public stopPolling = () => {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
  };

  private updateStatus = async () => {
    try {
      const { data } = await APIClient.get<ReindexOperation>(
        chrome.addBasePath(`/api/upgrade_assistant/reindex/${this.indexName}`)
      );
      this.updateWithReindexOp(data);

      // Keep polling if it has completed or failed.
      if (data.status === ReindexStatus.inProgress) {
        this.pollTimeout = setTimeout(this.updateStatus, POLL_INTERVAL);
      }
    } catch (e) {
      if (e.response && e.response.status === 404) {
        // Ignore any 404s (means reindex hasn't been started yet).
      } else {
        this.status$.next({
          ...this.status$.value,
          status: ReindexStatus.failed,
        });

        throw e;
      }
    }

    this.status$.next({
      ...this.status$.value,
      loadingState: LoadingState.Success,
    });
  };

  private updateWithReindexOp = (reindexOp: ReindexOperation) => {
    this.status$.next({
      ...this.status$.value,
      lastCompletedStep: reindexOp.lastCompletedStep,
      status: reindexOp.status,
      reindexTaskPercComplete: reindexOp.reindexTaskPercComplete,
      errorMessage: reindexOp.errorMessage,
    });
  };
}
