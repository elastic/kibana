/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isFunction } from 'lodash';

export class CancellationToken {
  private callbacks: Array<() => void>;
  private isCancelled: boolean;

  constructor() {
    this.isCancelled = false;
    this.callbacks = [];
  }

  public on = (callback: () => void) => {
    if (!isFunction(callback)) {
      throw new Error('Expected callback to be a function');
    }

    if (this.isCancelled) {
      callback();
      return;
    }

    this.callbacks.push(callback);
  };

  public cancel = () => {
    this.isCancelled = true;
    this.callbacks.forEach(callback => callback());
  };
}
