/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class IngestManagerError extends Error {
  public type: IngestManagerErrorType;
  public message: string;

  constructor(type: IngestManagerErrorType, message: string) {
    super(message);
    this.type = type;
    this.message = message;
  }
}

export const getHTTPResponseCode = (error: IngestManagerError): number => {
  switch (error.type) {
    case IngestManagerErrorType.RegistryError:
      return 502; // Bad Gateway
    default:
      return 400; // Bad Request
  }
};

export enum IngestManagerErrorType {
  RegistryError,
}
