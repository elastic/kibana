/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subscription } from 'rxjs';

export abstract class StateService {
  private subscriptions$: Subscription = new Subscription();

  protected _init() {
    this.subscriptions$ = this._initSubscriptions();
  }

  /**
   * Should return all active subscriptions.
   * @protected
   */
  protected abstract _initSubscriptions(): Subscription;

  public destroy() {
    this.subscriptions$.unsubscribe();
  }
}
