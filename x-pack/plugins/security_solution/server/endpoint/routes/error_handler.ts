/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { CustomHttpRequestError } from '../../utils/custom_http_request_error';
import { NotFoundError } from '../errors';
import { EndpointHostUnEnrolledError, EndpointHostNotFoundError } from '../services/metadata';

/**
 * Default Endpoint Routes error handler
 * @param logger
 * @param res
 * @param error
 */
export const errorHandler = <E extends Error>(
  logger: Logger,
  res: KibanaResponseFactory,
  error: E
): IKibanaResponse => {
  const shouldLogToDebug = () => {
    return error instanceof EndpointHostNotFoundError;
  };

  if (shouldLogToDebug()) {
    logger.debug(error.message);
  } else {
    logger.error(error);
  }

  if (error instanceof CustomHttpRequestError) {
    return res.customError({
      statusCode: error.statusCode,
      body: error,
    });
  }

  if (error instanceof NotFoundError) {
    return res.notFound({ body: error });
  }

  if (error instanceof EndpointHostUnEnrolledError) {
    return res.badRequest({ body: error });
  }

  if (error instanceof EndpointHostNotFoundError) {
    return res.notFound({ body: error });
  }

  // Kibana CORE will take care of `500` errors when the handler `throw`'s, including logging the error
  throw error;
};
