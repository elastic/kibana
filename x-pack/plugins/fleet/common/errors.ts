/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable max-classes-per-file */

import type { FleetErrorType } from './types';

export class FleetError extends Error {
  attributes?: { type: FleetErrorType };
  constructor(message?: string, public readonly meta?: unknown) {
    super(message);
    this.name = this.constructor.name; // for stack traces
  }
}

export class PackagePolicyValidationError extends FleetError {}

export class MessageSigningError extends FleetError {}
