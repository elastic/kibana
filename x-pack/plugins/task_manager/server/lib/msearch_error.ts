/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class MsearchError extends Error {
  private _statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this._statusCode = statusCode;
  }

  public get statusCode() {
    return this._statusCode;
  }
}

export function getMsearchStatusCode(error: Error | MsearchError): number | undefined {
  if (Boolean(error && error instanceof MsearchError)) {
    return (error as MsearchError).statusCode;
  }
}
