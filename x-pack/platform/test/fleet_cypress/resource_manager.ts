/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const CLEANUP_EVENTS = ['SIGINT', 'exit', 'uncaughtException', 'unhandledRejection'];
export class Manager {
  private cleaned = false;
  constructor() {
    const cleanup = () => this.cleanup();
    CLEANUP_EVENTS.forEach((ev) => process.on(ev, cleanup));
  }
  // This must be a synchronous method because it is used in the unhandledException and exit event handlers
  public cleanup() {
    // Since this can be called multiple places we proxy it with some protection
    if (this._cleanup && !this.cleaned) {
      this.cleaned = true;
      this._cleanup();
    }
  }
  protected _cleanup?(): void;
}
