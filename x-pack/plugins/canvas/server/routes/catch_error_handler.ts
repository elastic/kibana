/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandler, RequestHandlerContext } from '@kbn/core/server';

export const catchErrorHandler: <P, Q, B, Context extends RequestHandlerContext>(
  fn: RequestHandler<P, Q, B, Context>
) => RequestHandler<P, Q, B, Context> = (fn) => {
  return async (context, request, response) => {
    try {
      return await fn(context, request, response);
    } catch (error) {
      if (error.isBoom) {
        return response.customError({
          body: error.output.payload,
          statusCode: error.output.statusCode,
        });
      }
      throw error;
    }
  };
};
