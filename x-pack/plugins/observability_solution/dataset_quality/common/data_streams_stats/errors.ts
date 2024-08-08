/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiErrorResponse } from '../fetch_options';

export class GetDataStreamsStatsError extends Error {
  readonly statusCode?: number;
  readonly originalMessage?: string;

  constructor(message: string, originalError?: ApiErrorResponse) {
    super(message);
    this.name = 'GetDataStreamsStatsError';
    Object.setPrototypeOf(this, new.target.prototype);
    if (originalError && originalError.body) {
      const { statusCode, message: originalMessage } = originalError.body;
      this.statusCode = statusCode;
      this.originalMessage = originalMessage;
    }
  }
}
