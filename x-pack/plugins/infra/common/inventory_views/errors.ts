/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class FetchInventoryViewError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'FetchInventoryViewError';
  }
}

export class UpsertInventoryViewError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'UpsertInventoryViewError';
  }
}

export class DeleteInventoryViewError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'DeleteInventoryViewError';
  }
}
