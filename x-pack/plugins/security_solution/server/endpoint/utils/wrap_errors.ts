/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointError } from '../../../common/endpoint/errors';

/**
 * Will wrap the given Error with `EndpointError`, which will help getting a good picture of where in
 * our code the error originated (better stack trace).
 */
export const wrapErrorIfNeeded = <E extends EndpointError = EndpointError>(error: Error): E => {
  return (error instanceof EndpointError ? error : new EndpointError(error.message, error)) as E;
};

/**
 * used as the callback to `Promise#catch()` to ensure errors
 * (especially those from kibana/elasticsearch clients) are wrapped
 *
 * @param error
 */
export const catchAndWrapError = <E extends Error>(error: E) =>
  Promise.reject(wrapErrorIfNeeded(error));
