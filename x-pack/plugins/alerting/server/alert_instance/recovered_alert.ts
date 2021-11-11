/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceState, RawRecoveredAlert, AlertInstanceContext } from '../../common';

export class RecoveredAlert<
  State extends AlertInstanceState = AlertInstanceState,
  Context extends AlertInstanceContext = AlertInstanceContext
> {
  private context: Context;
  private state: State;

  constructor({ state, context }: RawRecoveredAlert = {}) {
    this.state = (state || {}) as State;
    this.context = (context || {}) as Context;
  }

  getContext() {
    return this.context;
  }

  getState() {
    return this.state;
  }

  setContext(context: Context = {} as Context) {
    this.context = context;
    return this;
  }

  replaceState(state: State) {
    this.state = state;
    return this;
  }
}
