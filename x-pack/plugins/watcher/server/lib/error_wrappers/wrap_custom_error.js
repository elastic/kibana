/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

/**
 * Wraps a custom error into a Boom error response and returns it
 *
 * @param err Object error
 * @param statusCode Error status code
 * @return Object Boom error response
 */
export function wrapCustomError(err, statusCode) {
  return Boom.boomify(err, { statusCode });
}
