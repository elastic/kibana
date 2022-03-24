/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boomify, isBoom } from '@hapi/boom';
import { errors } from '@elastic/elasticsearch';
import { isCustomError, handleCustomError } from './custom_errors';
import { isAuthError, handleAuthError } from './auth_errors';
import { ErrorTypes, LegacyRequest } from '../../types';
import { handleESClientError, isESClientError } from './esclient_errors';

export const getStatusCode = (err: ErrorTypes) => {
  return isBoom(err)
    ? err.output.statusCode
    : err instanceof errors.ResponseError
    ? err.statusCode
    : undefined;
};

export function handleError(err: ErrorTypes, req?: LegacyRequest) {
  if (req) {
    req.logger.error(err);
  }

  // handle auth errors
  if (isAuthError(err)) {
    return handleAuthError(err);
  }

  // handle custom Monitoring errors
  if (isCustomError(err)) {
    return handleCustomError(err);
  }

  // handle certain EsClientError errors
  if (isESClientError(err)) {
    return handleESClientError(err);
  }

  if (isBoom(err)) {
    return err;
  }

  const statusCode = getStatusCode(err);
  // wrap the error; defaults to statusCode = 500 if statusCode is undefined
  return boomify(err, { statusCode, message: err.message });
}
