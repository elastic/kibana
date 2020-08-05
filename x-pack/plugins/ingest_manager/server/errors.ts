/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */
export class IngestManagerError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name; // for stack traces
  }
}

export const getHTTPResponseCode = (error: IngestManagerError): number => {
  if (error instanceof RegistryError) {
    return 502; // Bad Gateway
  }
  if (error instanceof PackageNotFoundError) {
    return 404;
  }
  if (error instanceof PackageOutdatedError) {
    return 400;
  } else {
    return 400; // Bad Request
  }
};

export class RegistryError extends IngestManagerError {}
export class PackageNotFoundError extends IngestManagerError {}
export class PackageOutdatedError extends IngestManagerError {}
