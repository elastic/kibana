/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ObjectType } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';

export const catchErrorHandler: <
  P extends ObjectType<any>,
  Q extends ObjectType<any>,
  B extends ObjectType<any>
>(
  fn: RequestHandler<P, Q, B>
) => RequestHandler<P, Q, B> = fn => {
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
      return response.internalError({ body: error });
    }
  };
};
