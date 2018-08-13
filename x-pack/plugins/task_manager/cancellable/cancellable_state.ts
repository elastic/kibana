/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type CancelHandler = () => any;

export interface Cancellable {
  cancel: CancelHandler;
}

/**
 * An object that is used internally to the cancellable promise
 * to track the cancellation status and callbacks across the chain of promises.
 */
export class CancellableState {
  public isCancelled = false;

  private cancelHandlers: CancelHandler[] = [];

  /**
   * Adds a cancellation handler to the list of handlers. This
   * handler will be called once if the promise is ever cancelled,
   * regardless of whether or not the promise chain has passed
   * the place where the cancellation handler was declared.
   */
  public addHandler(fn: CancelHandler) {
    this.cancelHandlers.push(fn);
  }

  /**
   * Adds a reference to a nested cancellable, so that if the outer
   * cancellable is cancelled, the nested / child cancellable will
   * also be cancelled. (See the tests for an example of this.)
   */
  public addChild(cancellable: Cancellable) {
    this.cancelHandlers.push(() => cancellable.cancel());
  }

  /**
   * Cancels the promise chain and executes the handlers.
   *
   * @returns {Promise<void>}
   */
  public async cancel() {
    if (this.isCancelled) {
      return;
    }

    this.isCancelled = true;
    for (const fn of this.cancelHandlers) {
      await fn();
    }
  }
}
