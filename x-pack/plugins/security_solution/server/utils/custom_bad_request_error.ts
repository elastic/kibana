/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class CustomBadRequestError extends Error {
  readonly statusCode: number = 400;
  constructor(message: string) {
    super(message);
    this.name = 'CustomBadRequestError';
    this.message = message;
  }
}
