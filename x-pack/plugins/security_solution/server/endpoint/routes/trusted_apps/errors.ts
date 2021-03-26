/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

export class TrustedAppNotFoundError extends Error {
  constructor(id: string) {
    super(`Trusted Application (${id}) not found`);
  }
}

export class TrustedAppVersionConflictError extends Error {
  constructor(id: string, public sourceError: Error) {
    super(`Trusted Application (${id}) has been updated since last retrieved`);
  }
}
