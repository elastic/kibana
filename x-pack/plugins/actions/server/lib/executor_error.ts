/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class ExecutorError extends Error {
  readonly data?: unknown;
  readonly retry: boolean | Date;
  constructor(message?: string, data?: unknown, retry: boolean | Date = false) {
    super(message);
    this.data = data;
    this.retry = retry;
  }
}
