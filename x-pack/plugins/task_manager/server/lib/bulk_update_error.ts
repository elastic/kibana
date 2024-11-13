/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class BulkUpdateError extends Error {
  private _statusCode: number;
  private _type: string;

  constructor({
    statusCode,
    message = 'Bulk update failed with unknown reason',
    type,
  }: {
    statusCode: number;
    message?: string;
    type: string;
  }) {
    super(message);
    this._statusCode = statusCode;
    this._type = type;
  }

  public get statusCode() {
    return this._statusCode;
  }

  public get type() {
    return this._type;
  }
}

export function getBulkUpdateStatusCode(error: Error | BulkUpdateError): number | undefined {
  if (Boolean(error && error instanceof BulkUpdateError)) {
    return (error as BulkUpdateError).statusCode;
  }
}

export function getBulkUpdateErrorType(error: Error | BulkUpdateError): string | undefined {
  if (Boolean(error && error instanceof BulkUpdateError)) {
    return (error as BulkUpdateError).type;
  }
}
