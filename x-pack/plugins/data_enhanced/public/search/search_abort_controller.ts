/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER, Subscription, timer } from 'rxjs';

export enum AbortReason {
  Timeout = 'timeout',
}

export class SearchAbortController {
  private inputAbortSignals: AbortSignal[] = new Array();
  private abortController: AbortController = new AbortController();
  private timeoutSub?: Subscription;
  private boundAbortHandler: (this: AbortSignal, ev: Event) => void;
  private destroyed = false;
  private reason?: AbortReason;

  constructor(abortSignal?: AbortSignal, timeout?: number) {
    this.boundAbortHandler = this.abortHandler.bind(this);
    if (abortSignal) {
      this.addAbortSignal(abortSignal);
    }

    if (timeout) {
      const timeout$ = timeout ? timer(timeout) : NEVER;
      this.timeoutSub = timeout$.subscribe(() => {
        this.reason = AbortReason.Timeout;
        this.abortController.abort();
        this.timeoutSub!.unsubscribe();
      });
    }
  }

  private abortHandler() {
    const allAborted = this.inputAbortSignals.every((signal) => signal.aborted);
    if (allAborted) {
      this.abortController.abort();
      this.cleanup();
    }
  }

  public cleanup() {
    this.destroyed = true;
    this.timeoutSub?.unsubscribe();
    this.inputAbortSignals.forEach((abortSignal) => {
      abortSignal.removeEventListener('abort', this.boundAbortHandler);
    });
  }

  public addAbortSignal(inputSignal: AbortSignal) {
    if (this.destroyed) {
      return;
    }

    this.inputAbortSignals.push(inputSignal);

    if (inputSignal.aborted) {
      this.abortHandler();
    } else {
      // abort our internal controller if the input signal aborts
      inputSignal.addEventListener('abort', this.boundAbortHandler);
    }
  }

  public getSignal() {
    return this.abortController.signal;
  }

  public abort() {
    this.cleanup();
    this.abortController.abort();
  }

  public isTimeout() {
    return this.reason === AbortReason.Timeout;
  }
}
