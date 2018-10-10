/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import Boom from 'boom';

/**
 * Wraps ES errors into a Boom error response and returns it
 * This also handles the permissions issue gracefully
 *
 * @param err Object ES error
 * @return Object Boom error response
 */
export function wrapEsError(err: any) {
  const statusCode = err.statusCode;
  if (statusCode === 403) {
    return Boom.forbidden('Insufficient user permissions for managing Beats configuration');
  }

  // This is due to a typings error in the Boom typedef.
  // @ts-ignore
  if (Boom.wrap) {
    // @ts-ignore
    return Boom.wrap(err, err.statusCode);
  }

  return Boom.boomify(err, { statusCode: err.statusCode });
}
