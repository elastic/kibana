/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';

import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../common/types/error_codes';

import { createError, EnterpriseSearchError } from './create_error';
import { isUnauthorizedException } from './identify_exceptions';

export function elasticsearchErrorHandler<ContextType, RequestType, ResponseType>(
  log: Logger,
  requestHandler: RequestHandler<ContextType, RequestType, ResponseType>
): RequestHandler<ContextType, RequestType, ResponseType> {
  return async (context, request, response) => {
    try {
      return await requestHandler(context, request, response);
    } catch (error) {
      let enterpriseSearchError: EnterpriseSearchError | undefined;

      if (isUnauthorizedException(error)) {
        enterpriseSearchError = {
          errorCode: ErrorCode.UNAUTHORIZED,
          message: i18n.translate('xpack.enterpriseSearch.server.routes.unauthorizedError', {
            defaultMessage: 'You do not have sufficient permissions.',
          }),
          statusCode: 403,
        };
      } else {
        enterpriseSearchError = {
          errorCode: ErrorCode.UNCAUGHT_EXCEPTION,
          message: i18n.translate('xpack.enterpriseSearch.server.routes.uncaughtExceptionError', {
            defaultMessage: 'Enterprise Search encountered an error.',
          }),
          statusCode: 502,
        };
      }

      if (enterpriseSearchError !== undefined) {
        log.error(
          i18n.translate('xpack.enterpriseSearch.server.routes.errorLogMessage', {
            defaultMessage:
              'An error occurred while resolving request to {requestUrl}: {errorMessage}',
            values: {
              errorMessage: enterpriseSearchError.message,
              requestUrl: request.url.toString(),
            },
          })
        );
        log.error(error);
        return createError({
          ...enterpriseSearchError,
          message: i18n.translate('xpack.enterpriseSearch.server.routes.checkKibanaLogsMessage', {
            defaultMessage: '{errorMessage} Check Kibana Server logs for details.',
            values: {
              errorMessage: enterpriseSearchError.message,
            },
          }),
          response,
        });
      }

      throw error;
    }
  };
}
