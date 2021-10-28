/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class EndpointDataLoadingError extends Error {
  constructor(message: string, public meta?: unknown) {
    super(message);
  }
}

export const wrapErrorIfNeeded = (error: Error): EndpointDataLoadingError =>
  error instanceof EndpointDataLoadingError
    ? error
    : new EndpointDataLoadingError(error.message, error);

// Use it in Promise's `.catch()` as `.catch(wrapErrorAndRejectPromise)`
export const wrapErrorAndRejectPromise = (error: Error) => Promise.reject(wrapErrorIfNeeded(error));
