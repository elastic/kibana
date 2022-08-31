/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum SessionErrorReason {
  'SESSION_MISSING' = 'SESSION_MISSING',
  'SESSION_EXPIRED' = 'SESSION_EXPIRED',
  'UNEXPECTED_SESSION_ERROR' = 'UNEXPECTED_SESSION_ERROR',
}

export class SessionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}
