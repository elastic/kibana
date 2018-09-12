/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from './errors';
import { addSpaceIdToPath, getSpaceIdFromPath } from './spaces_url_parser';
import { DEFAULT_SPACE_ID } from '../../common/constants';

export function initSpacesRequestInterceptors(server) {

  const serverBasePath = server.config().get('server.basePath');

  server.ext('onRequest', async function spacesOnRequestHandler(request, reply) {
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

    return reply.continue();
  });

  server.ext('onPostAuth', async function spacesOnRequestHandler(request, reply) {
    const path = request.path;

    const isRequestingKibanaRoot = path === '/';

    // if requesting the application root, then show the Space Selector UI to allow the user to choose which space
    // they wish to visit. This is done "onPostAuth" to allow the Saved Objects Client to use the request's auth scope,
    // which is not available at the time of "onRequest".
    if (isRequestingKibanaRoot) {
      try {
        const spacesClient = server.plugins.spaces.spacesClient.getScopedClient(request);
        const spaces = await spacesClient.getAll();

        const config = server.config();
        const basePath = config.get('server.basePath');
        const defaultRoute = config.get('server.defaultRoute');

        if (spaces.length === 1) {
          // If only one space is available, then send user there directly.
          // No need for an interstitial screen where there is only one possible outcome.
          const space = spaces[0];

          const destination = addSpaceIdToPath(basePath, space.id, defaultRoute);
          return reply.redirect(destination);
        }

        if (spaces.length > 0) {
          // render spaces selector instead of home page
          const app = server.getHiddenUiAppById('space_selector');
          return reply.renderApp(app, {
            spaces
          });
        }

      } catch (error) {
        return reply(wrapError(error));
      }
    }

    return reply.continue();
  });


}
