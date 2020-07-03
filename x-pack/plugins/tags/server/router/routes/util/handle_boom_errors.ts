/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, RouteMethod, RequestHandlerContext } from 'src/core/server';
import { isBoom } from 'boom';

export const handleBoomErrors = <A, B, C, D extends RouteMethod>(
  handler: RequestHandler<A, B, C, D>
): RequestHandler<A, B, C, D> => async (context, request, response) => {
  try {
    return await handler(context, request, response);
  } catch (error) {
    if (isBoom(error)) {
      return response.badRequest({
        body: {
          message: error.message,
          attributes: error.data,
        },
      });
    }

    throw error;
  }
};
