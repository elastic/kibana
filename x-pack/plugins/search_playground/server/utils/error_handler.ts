/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerWrapper } from '@kbn/core-http-server';
import { i18n } from '@kbn/i18n';
import { ErrorCode } from '../types';
import { createError } from './create_error';

export const errorHandler: RequestHandlerWrapper = (handler) => {
  return async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      return createError({
        errorCode: ErrorCode.UNCAUGHT_EXCEPTION_ERROR,
        message: i18n.translate('xpack.searchPlayground.server.routes.uncaughtExceptionError', {
          defaultMessage: 'Playground encountered an error.',
        }),
        response,
        statusCode: 500,
      });
    }
  };
};
