/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const extractCausedByChain = (causedBy: any = {}, accumulator: any[] = []): any => {
  const { reason, caused_by } = causedBy; // eslint-disable-line @typescript-eslint/camelcase

  if (reason) {
    accumulator.push(reason);
  }

  // eslint-disable-next-line @typescript-eslint/camelcase
  if (caused_by) {
    return extractCausedByChain(caused_by, accumulator);
  }

  return accumulator;
};

/**
 * Wraps an error thrown by the ES JS client into a Boom error response and returns it
 *
 * @param err Object Error thrown by ES JS client
 * @param statusCodeToMessageMap Object Optional map of HTTP status codes => error messages
 * @return Object Boom error response
 */
export const wrapEsError = (err: any, statusCodeToMessageMap: any = {}) => {
  const { statusCode, response } = err;

  const {
    error: {
      root_cause = [], // eslint-disable-line @typescript-eslint/camelcase
      caused_by = {}, // eslint-disable-line @typescript-eslint/camelcase
    } = {},
  } = JSON.parse(response);

  // If no custom message if specified for the error's status code, just
  // wrap the error as a Boom error response, include the additional information from ES, and return it
  if (!statusCodeToMessageMap[statusCode]) {
    // const boomError = Boom.boomify(err, { statusCode });
    const error: any = { statusCode };

    // The caused_by chain has the most information so use that if it's available. If not then
    // settle for the root_cause.
    const causedByChain = extractCausedByChain(caused_by);
    const defaultCause = root_cause.length ? extractCausedByChain(root_cause[0]) : undefined;

    error.cause = causedByChain.length ? causedByChain : defaultCause;
    return error;
  }

  // Otherwise, use the custom message to create a Boom error response and
  // return it
  const message = statusCodeToMessageMap[statusCode];
  return { message, statusCode };
};
