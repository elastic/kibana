/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { getSpaceIdFromPath } from '../spaces_url_parser';
import { InterceptorDeps } from '.';

export function initSpacesOnRequestInterceptor({ config, legacyServer }: InterceptorDeps) {
  const serverBasePath: string = config.get('server.basePath');

  legacyServer.ext('onRequest', async function spacesOnRequestHandler(request: any, h: any) {
    const path = request.path;

    // If navigating within the context of a space, then we store the Space's URL Context on the request,
    // and rewrite the request to not include the space identifier in the URL.
    const spaceId = getSpaceIdFromPath(path, serverBasePath);

    if (spaceId !== DEFAULT_SPACE_ID) {
      const reqBasePath = `/s/${spaceId}`;
      request.setBasePath(reqBasePath);

      const newLocation = path.substr(reqBasePath.length) || '/';

      const newUrl = {
        ...request.url,
        path: newLocation,
        pathname: newLocation,
        href: newLocation,
      };

      request.setUrl(newUrl);
    }

    return h.continue;
  });
}
