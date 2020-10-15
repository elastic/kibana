/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum Status {
  Canceled,
  Failed,
  Resolved,
  Awaiting,
  Idle,
}

/**
 * Simple [PromiseWithCancel] factory
 */
export class PromiseWithCancel {
  private _promise: Promise<any>;
  private _status: Status = Status.Idle;

  /**
   * @param {Promise} promise  Promise you want to cancel / track
   */
  constructor(promise: Promise<any>) {
    this._promise = promise;
  }

  /**
   * Cancel the promise in any state
   */
  public cancel = (): void => {
    this._status = Status.Canceled;
  };

  /**
   * @returns status based on [Status]
   */
  public status = (): Status => {
    return this._status;
  };

  /**
   * @returns promise passed in [constructor]
   * This sets the state to Status.Awaiting
   */
  public promise = (): Promise<any> => {
    if (this._status === Status.Canceled) {
      throw Error('Getting a canceled promise is not allowed');
    } else if (this._status !== Status.Idle) {
      return this._promise;
    }
    return new Promise((resolve, reject) => {
      this._status = Status.Awaiting;
      return this._promise
        .then((response) => {
          if (this._status !== Status.Canceled) {
            this._status = Status.Resolved;
            return resolve(response);
          }
        })
        .catch((error) => {
          if (this._status !== Status.Canceled) {
            this._status = Status.Failed;
            return reject(error);
          }
        });
    });
  };
}
