/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export class CustomRequestError extends Error {
  constructor({ message, name }: { message: string; name: string; readonly statusCode: number }) {
    super(message);
    this.name = name;
    this.message = message;
  }
}
