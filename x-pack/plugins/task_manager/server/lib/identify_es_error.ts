/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface ESErrorCausedBy {
  type?: string;
  reason?: string;
  caused_by?: ESErrorCausedBy;
}

export interface ESError {
  root_cause?: ESErrorCausedBy[];
  caused_by?: ESErrorCausedBy;
}

function extractCausedByChain(
  causedBy: ESErrorCausedBy = {},
  accumulator: string[] = []
): string[] {
  const { reason, caused_by: innerCausedBy } = causedBy;

  if (reason) {
    accumulator.push(reason);
  }

  if (innerCausedBy) {
    return extractCausedByChain(innerCausedBy, accumulator);
  }

  return accumulator;
}

/**
 * Identified causes for ES Error
 *
 * @param err Object Error thrown by ES JS client
 * @return ES error cause
 */
export function identifyEsError(err: { response: string }) {
  const { response } = err;

  if (response) {
    const { error } = JSON.parse(response) as { error?: ESError };
    if (error) {
      const { root_cause: rootCause = [], caused_by: causedBy } = error;

      return [
        ...extractCausedByChain(causedBy),
        ...rootCause.reduce(
          (acc: string[], innerRootCause) => extractCausedByChain(innerRootCause, acc),
          []
        ),
      ];
    }
  }
  return [];
}
