/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify } from '@hapi/boom';
import { isKnownError, handleKnownError } from './known_errors';
import { isAuthError, handleAuthError } from './auth_errors';

export function handleError(err, req) {
  req && req.logger && req.logger.error(err);

  // specially handle auth errors
  if (isAuthError(err)) {
    return handleAuthError(err);
  }

  // specially "service unavailable" errors
  if (isKnownError(err)) {
    return handleKnownError(err);
  }

  if (err.isBoom) {
    return err;
  }

  // boom expects err.message, not err.msg
  if (err.msg) {
    err.message = err.msg;
    delete err.msg;
  }

  const statusCode = err.isBoom ? err.output.statusCode : err.statusCode;
  // wrap the error; defaults to statusCode = 500 if statusCode is undefined
  return boomify(err, { statusCode, message: err.message });
}
