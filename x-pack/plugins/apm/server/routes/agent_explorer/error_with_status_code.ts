/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ErrorWithStatusCode extends Error {
  constructor(message: string, public readonly statusCode: string) {
    super(message);
  }
}
