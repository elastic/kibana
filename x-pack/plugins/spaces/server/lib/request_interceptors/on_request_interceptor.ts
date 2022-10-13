/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  KibanaRequest,
  LifecycleResponseFactory,
  OnPreRoutingToolkit,
} from '@kbn/core/server';

import { getSpaceIdFromPath } from '../../../common';

export interface OnRequestInterceptorDeps {
  http: CoreSetup['http'];
}
export function initSpacesOnRequestInterceptor({ http }: OnRequestInterceptorDeps) {
  http.registerOnPreRouting(async function spacesOnPreRoutingHandler(
    request: KibanaRequest,
    response: LifecycleResponseFactory,
    toolkit: OnPreRoutingToolkit
  ) {
    const serverBasePath = http.basePath.serverBasePath;
    const path = request.url.pathname;

    // If navigating within the context of a space, then we store the Space's URL Context on the request,
    // and rewrite the request to not include the space identifier in the URL.
    const { spaceId, pathHasExplicitSpaceIdentifier } = getSpaceIdFromPath(path, serverBasePath);

    if (pathHasExplicitSpaceIdentifier) {
      const reqBasePath = `/s/${spaceId}`;

      http.basePath.set(request, reqBasePath);

      const newPathname = path.substr(reqBasePath.length) || '/';

      return toolkit.rewriteUrl(`${newPathname}${request.url.search}`);
    }

    return toolkit.next();
  });
}
