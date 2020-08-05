/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isFunction } from 'lodash';

export class CancellationToken {
  private _isCancelled: boolean;
  private _callbacks: Function[];

  constructor() {
    this._isCancelled = false;
    this._callbacks = [];
  }

  public on = (callback: Function) => {
    if (!isFunction(callback)) {
      throw new Error('Expected callback to be a function');
    }

    if (this._isCancelled) {
      callback();
      return;
    }

    this._callbacks.push(callback);
  };

  public cancel = () => {
    this._isCancelled = true;
    this._callbacks.forEach((callback) => callback());
  };

  public isCancelled() {
    return this._isCancelled;
  }
}
