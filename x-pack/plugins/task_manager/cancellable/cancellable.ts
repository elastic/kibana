/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CancelHandler, CancellableState } from './cancellable_state';

/**
 * Provides thin wrapper around a promise that allwos the promise chain
 * to be cancelled.
 */

/**
 * A lightweight wrapper around native promises that allows for cancellation.
 */
export class Cancellable<T> implements PromiseLike<T> {
  private wrappedPromise: Promise<any>;

  private state: CancellableState;

  /**
   * Creates an instance of Cancellable.
   *
   * @param {Promise} [promise] The promise being wrapped.
   * @memberof Cancellable
   */
  constructor(promise = Promise.resolve(), state = new CancellableState()) {
    this.wrappedPromise = promise;

    // We don't really want to expose this to the outside world, but
    // it's important that we share the same cancellable state between
    // all of our child promises, so we pass it as a hidden second param
    // to our constructor and use it if it's provided. If it's not provided,
    // the constructor is being called by an outsider.
    this.state = state;
  }

  /**
   * Attaches callbacks for the resolution and/or rejection of the Promise.
   * @param onfulfilled — The callback to execute when the Promise is resolved.
   * @param onrejected — The optional callback to execute when the Promise is rejected.
   * @returns — A Promise for the completion of which ever callback is executed.
   * @memberof Cancellable
   */
  public then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
  ): Cancellable<TResult1 | TResult2> {
    return new Cancellable(
      this.wrappedPromise.then(this.wrap(onfulfilled, onrejected), onrejected),
      this.state
    );
  }

  /**
   * Attaches a callback for only the rejection of the Promise.
   * @param onrejected — The callback to execute when the Promise is rejected.
   * @returns — A Promise for the completion of the callback.
   */
  public catch<TResult>(
    onrejected: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined
  ): Cancellable<TResult> {
    return new Cancellable(this.wrappedPromise.catch(this.wrap(onrejected)), this.state);
  }

  /**
   * Attaches a callback for cancellation of the Promise. Does not affect the
   * result of the promise.
   *
   * @param oncancelled - The callback to execute when the Promise is cancelled.
   * @returns - A Promise
   * @memberof Cancellable
   */
  public cancelled(oncancelled: CancelHandler) {
    this.state.addHandler(oncancelled);
    return this;
  }

  /**
   * Cancels the promise chain and waits for the cancellation callbacks to resolve.
   *
   * @memberof Cancellable
   */
  public async cancel() {
    await this.state.cancel();
  }

  /**
   * Wraps the success / failure handlers with a function that understands cancellation
   * and skips further processing if the promise chain has been cancelled.
   */
  private wrap(success: any, failure?: any) {
    return (arg: any) => {
      if (this.state.isCancelled) {
        const error = new Error('Promise cancelled');
        (error as any).status = 'cancelled';
        if (failure) {
          return failure(error);
        }
        return error;
      }

      const result = success(arg);
      if (result && typeof result.cancel === 'function' && typeof result.then === 'function') {
        this.state.addChild(result);
      }
      return result;
    };
  }
}
