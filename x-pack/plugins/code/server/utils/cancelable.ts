/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
type Resolve<T> = (t: T) => void;
type Reject = (error: any) => void;
type Cancel = (error: any) => void;
type OnCancel = (cancel: Cancel) => void;

export class Cancelable<T> {
  public readonly promise: Promise<T>;
  private resolve: Resolve<T> | undefined = undefined;
  private reject: Reject | undefined = undefined;
  private _cancel: Cancel | undefined = undefined;

  constructor(readonly fn: (resolve: Resolve<T>, reject: Reject, onCancel: OnCancel) => void) {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    fn(this.resolve!, this.reject!, (cancel: Cancel) => {
      this._cancel = cancel;
    });
  }

  public cancel(error = 'canceled'): void {
    if (this._cancel) {
      this._cancel(error);
    } else if (this.reject) {
      this.reject(error);
    }
  }

  public error(error: any) {
    if (this.reject) {
      this.reject(error);
    }
  }
}
