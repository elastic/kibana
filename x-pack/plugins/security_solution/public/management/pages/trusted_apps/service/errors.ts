/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointError } from '../../../../../common/endpoint/errors';

export class HttpRequestValidationError extends EndpointError<string[]> {
  public readonly body: { message: string };
  constructor(validationFailures: string[]) {
    super('Invalid trusted application', validationFailures);
    // Attempts to mirror an HTTP API error body
    this.body = {
      message: validationFailures.join(', ') ?? 'unknown',
    };
  }
}
