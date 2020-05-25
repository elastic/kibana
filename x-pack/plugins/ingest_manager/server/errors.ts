/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class IngestManagerError {
  private type: IngestManagerErrorType;
  private message: string;

  constructor(type: IngestManagerErrorType, message: string) {
    this.type = type;
    this.message = message;
  }

  public getType = (): IngestManagerErrorType => {
    return this.type;
  };

  public getMessage = (): string => {
    return this.message;
  };
}

export const getHTTPResponseCode = (error: IngestManagerError): number => {
  switch (error.getType()) {
    case IngestManagerErrorType.RegistryError:
      return 502; // Bad Gateway
    default:
      return 400; // Bad Request
  }
};

export enum IngestManagerErrorType {
  RegistryError,
}
