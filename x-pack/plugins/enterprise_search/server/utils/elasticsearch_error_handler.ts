/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IKibanaResponse, RequestHandler } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { ErrorCode } from '../../common/types/error_codes';

import { createError } from './create_error';

export function elasticsearchErrorHandler(
  log: Logger,
  requestHandler: RequestHandler
): RequestHandler {
  return async (context, request, response) => {
    try {
      return await requestHandler(context, request, response);
    } catch (error) {
      let kibanaResponse: IKibanaResponse | undefined;

      if (error.meta.statusCode === 403) {
        kibanaResponse = createError({
          errorCode: ErrorCode.UNAUTHORIZED,
          message: i18n.translate(
            'xpack.enterpriseSearch.server.routes.addCrawler.unauthorizedError',
            {
              defaultMessage: 'This account does not have permission to do this.',
            }
          ),
          response,
          statusCode: 409,
        });
      }

      if (typeof kibanaResponse !== 'undefined') {
        log.error(error);
        return kibanaResponse;
      }

      throw error;
    }
  };
}
