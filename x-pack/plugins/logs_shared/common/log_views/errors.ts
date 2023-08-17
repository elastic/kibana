/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class ResolveLogViewError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ResolveLogViewError';
  }
}

export class FetchLogViewError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'FetchLogViewError';
  }
}

export class FetchLogViewStatusError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'FetchLogViewStatusError';
  }
}

export class PutLogViewError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'PutLogViewError';
  }
}
