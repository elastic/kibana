/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { CustomHttpRequestError } from '../utils/custom_http_request_error';
import { BaseError, NoIndicesMeteringError, NoPrivilegeMeteringError } from '../common/errors';
import { AutoOpsError } from '../services/errors';

export class NotFoundError extends BaseError {}

/**
 * Default Data Usage Routes error handler
 * @param logger
 * @param res
 * @param error
 */
export const errorHandler = <E extends Error>(
  logger: Logger,
  res: KibanaResponseFactory,
  error: E
): IKibanaResponse => {
  logger.error(error);

  if (error instanceof CustomHttpRequestError) {
    return res.customError({
      statusCode: error.statusCode,
      body: error,
    });
  }

  if (error instanceof AutoOpsError) {
    return res.customError({
      statusCode: 503,
      body: error,
    });
  }

  if (error instanceof NotFoundError) {
    return res.notFound({ body: error });
  }

  if (error.message.includes('security_exception')) {
    return res.forbidden({
      body: {
        message: NoPrivilegeMeteringError,
      },
    });
  }

  if (error.message.includes('index_not_found_exception')) {
    return res.notFound({
      body: {
        message: NoIndicesMeteringError,
      },
    });
  }

  // Kibana CORE will take care of `500` errors when the handler `throw`'s, including logging the error
  throw error;
};
