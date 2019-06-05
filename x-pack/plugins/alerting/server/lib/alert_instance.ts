/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State, Context } from '../types';

interface ConstructorOptions {
  state?: Record<string, any>;
  meta?: Record<string, any>;
}

export class AlertInstance {
  private _shouldFire: boolean = false;
  private _fireOptions?: Record<string, any>;
  private _meta: Record<string, any>;
  private _state: Record<string, any>;

  constructor({ state = {}, meta = {} }: ConstructorOptions = {}) {
    this._state = state;
    this._meta = meta;
  }

  shouldFire() {
    return this._shouldFire;
  }

  getFireOptions() {
    return this._fireOptions;
  }

  resetFire() {
    this._shouldFire = false;
    delete this._fireOptions;
    return this;
  }

  getState() {
    return this._state;
  }

  getMeta() {
    return this._meta;
  }

  fire(actionGroup: string, context: Context = {}) {
    this._shouldFire = true;
    this._fireOptions = { actionGroup, context, state: this._state };
    return this;
  }

  replaceState(state: State) {
    this._state = state;
    return this;
  }

  replaceMeta(meta: Record<string, any>) {
    this._meta = meta;
    return this;
  }

  /**
   * Used to serialize alert instance state
   */
  toJSON() {
    return {
      state: this._state,
      meta: this._meta,
    };
  }
}
