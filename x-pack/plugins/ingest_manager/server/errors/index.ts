/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */
export { defaultIngestErrorHandler, ingestErrorToResponseOptions } from './handlers';

export class IngestManagerError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name; // for stack traces
  }
}
export class RegistryError extends IngestManagerError {}
export class RegistryConnectionError extends RegistryError {}
export class RegistryResponseError extends RegistryError {}
export class PackageNotFoundError extends IngestManagerError {}
export class PackageOutdatedError extends IngestManagerError {}
