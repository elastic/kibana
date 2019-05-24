/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface FireOptions {
  actionGroupId: string;
  context: any;
  state: any;
}

export class AlertInstance {
  private fireOptions?: FireOptions;
  private previousState: any = {};

  public getFireOptions() {
    return this.fireOptions;
  }

  public clearFireOptions() {
    this.fireOptions = undefined;
  }

  public getPreviousState() {
    return this.previousState;
  }

  fire(actionGroupId: string, context: Record<string, any>, state: Record<string, any>) {
    this.fireOptions = { actionGroupId, context, state };
  }

  replaceState(state: Record<string, any>) {
    this.previousState = state;
  }
}
