/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class ObservabilityError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SLONotFound extends ObservabilityError {}
export class SLOIdConflict extends ObservabilityError {}
export class InternalQueryError extends ObservabilityError {}
export class NotSupportedError extends ObservabilityError {}
export class IllegalArgumentError extends ObservabilityError {}
export class InvalidTransformError extends ObservabilityError {}
