/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class SLOError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SLONotFound extends SLOError {}
export class SLOIdConflict extends SLOError {}

export class InternalQueryError extends SLOError {}
export class IllegalArgumentError extends SLOError {}
export class InvalidTransformError extends SLOError {}

export class SecurityException extends SLOError {}
