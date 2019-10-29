/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, HttpResponseOptions } from '../../../../../src/core/server';
import { fetchNewsItems } from '../lib/fetch_news_items';

interface RouteDefinitionParams {
  router: IRouter;
  kibanaVersion: string;
}

function defineGetItemsRoute({ router, kibanaVersion }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/newsfeed/news',
      validate: false,
      options: { authRequired: true },
    },
    (context, request, response) => {
      return fetchNewsItems(kibanaVersion).then((httpResponse: HttpResponseOptions) => {
        return response.ok({
          body: httpResponse,
        });
      });
    }
  );
}

export function defineRoutes(params: RouteDefinitionParams) {
  defineGetItemsRoute(params);
}
