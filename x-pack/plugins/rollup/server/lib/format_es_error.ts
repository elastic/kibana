/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function extractCausedByChain(
  causedBy: Record<string, any> = {},
  accumulator: string[] = []
): string[] {
  const { reason, caused_by } = causedBy; // eslint-disable-line @typescript-eslint/naming-convention

  if (reason) {
    accumulator.push(reason);
  }

  if (caused_by) {
    return extractCausedByChain(caused_by, accumulator);
  }

  return accumulator;
}

/**
 * Wraps an error thrown by the ES JS client into a Boom error response and returns it
 *
 * @param err Object Error thrown by ES JS client
 * @param statusCodeToMessageMap Object Optional map of HTTP status codes => error messages
 */
export function wrapEsError(
  err: any,
  statusCodeToMessageMap: Record<string, string> = {}
): { message: string; body?: { cause?: string[] }; statusCode: number } {
  const { statusCode, response } = err;

  const {
    error: {
      root_cause = [], // eslint-disable-line @typescript-eslint/naming-convention
      caused_by = undefined, // eslint-disable-line @typescript-eslint/naming-convention
    } = {},
  } = JSON.parse(response);

  // If no custom message if specified for the error's status code, just
  // wrap the error as a Boom error response and return it
  if (!statusCodeToMessageMap[statusCode]) {
    // The caused_by chain has the most information so use that if it's available. If not then
    // settle for the root_cause.
    const causedByChain = extractCausedByChain(caused_by);
    const defaultCause = root_cause.length ? extractCausedByChain(root_cause[0]) : undefined;

    return {
      message: err.message,
      statusCode,
      body: {
        cause: causedByChain.length ? causedByChain : defaultCause,
      },
    };
  }

  // Otherwise, use the custom message to create a Boom error response and
  // return it
  const message = statusCodeToMessageMap[statusCode];
  return { message, statusCode };
}

export function formatEsError(err: any): any {
  const { statusCode, message, body } = wrapEsError(err);
  return {
    statusCode,
    body: {
      message,
      attributes: {
        cause: body?.cause,
      },
    },
  };
}
