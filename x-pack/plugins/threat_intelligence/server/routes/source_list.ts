/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, RequestHandler } from '@kbn/core/server';
import { DataRequestHandlerContext, getRequestAbortedSignal } from '@kbn/data-plugin/server';

import { API_ROUTE_SOURCES } from '../../common/constants';
import { findSources } from '../sources/find_sources';

export function sourceListRequestHandlerFactory(): RequestHandler<
  unknown,
  unknown,
  unknown,
  DataRequestHandlerContext
> {
  return async (context, request, response) => {
    const search = await context.search;
    const abortSignal = getRequestAbortedSignal(request.events.aborted$);

    const sources = await findSources(search, abortSignal);

    return response.ok({ body: sources });
  };
}

export function registerSourceListRoute(router: IRouter<DataRequestHandlerContext>) {
  router.get(
    {
      path: API_ROUTE_SOURCES,
      validate: {},
    },
    sourceListRequestHandlerFactory()
  );
}
