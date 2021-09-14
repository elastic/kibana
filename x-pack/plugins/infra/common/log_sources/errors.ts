/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class ResolveLogSourceConfigurationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ResolveLogSourceConfigurationError';
  }
}

export class FetchLogSourceConfigurationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'FetchLogSourceConfigurationError';
  }
}

export class FetchLogSourceStatusError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'FetchLogSourceStatusError';
  }
}

export class PatchLogSourceConfigurationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'PatchLogSourceConfigurationError';
  }
}
