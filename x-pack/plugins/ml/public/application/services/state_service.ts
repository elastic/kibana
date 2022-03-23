/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';

export abstract class StateService {
  private subscribtions$: Subscription = new Subscription();

  protected _init() {
    this.subscribtions$ = this._initSubscribtions();
  }

  /**
   * Should return all active subscribtions.
   * @protected
   */
  protected abstract _initSubscribtions(): Subscription;

  public destroy() {
    this.subscribtions$.unsubscribe();
  }
}
