/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandler, RouteMethod, RequestHandlerContext } from 'src/core/server';
import { TagsRouteContext, TagsRequestHandler } from '../../types';

const isTagsRouteContext = (context: RequestHandlerContext): context is TagsRouteContext =>
  !!context.tags;

export const assertTagsContext = <A, B, C, D extends RouteMethod>(
  handler: TagsRequestHandler<A, B, C, D>
): RequestHandler<A, B, C, D> => (context, request, response) => {
  return isTagsRouteContext(context)
    ? handler(context, request, response)
    : response.badRequest({ body: 'TagsRequestHandlerContext is not registered.' });
};
