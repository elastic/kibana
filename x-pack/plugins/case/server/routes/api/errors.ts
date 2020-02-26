/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class HttpRequestError extends Error {
  constructor(public statusCode: number, public message: string) {
    super();
  }
}
