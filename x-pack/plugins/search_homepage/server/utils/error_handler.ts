/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';

export function errorHandler<ContextType, RequestType, ResponseType>(
  logger: Logger,
  requestHandler: RequestHandler<ContextType, RequestType, ResponseType>
): RequestHandler<ContextType, RequestType, ResponseType> {
  return async (context, request, response) => {
    try {
      return await requestHandler(context, request, response);
    } catch (e) {
      logger.error(
        i18n.translate('xpack.searchHomepage.routes.unhandledException', {
          defaultMessage:
            'An error occurred while resolving request to {requestMethod} {requestUrl}:',
          values: {
            requestMethod: request.route.method,
            requestUrl: request.url.pathname,
          },
        })
      );
      logger.error(e);
      throw e;
    }
  };
}
