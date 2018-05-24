/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapError } from './errors';
import { addSpaceUrlContext, SELECTED_SPACE_COOKIE } from '../../common';
import { setSelectedSpace } from './selected_space_state';

export function initSpacesRequestInterceptors(server) {
  const contextCache = new WeakMap();

  server.ext('onRequest', async function spacesOnRequestHandler(request, reply) {
    const path = request.path;

    // If navigating within the context of a space, then we store the Space's URL Context on the request,
    // and rewrite the request to not include the space identifier in the URL.

    if (path.startsWith('/s/')) {
      const pathParts = path.split('/');

      const spaceUrlContext = pathParts[2];

      const reqBasePath = `/s/${spaceUrlContext}`;
      request.setBasePath(reqBasePath);

      const newUrl = {
        ...request.url,
        path: path.substr(reqBasePath.length) || '/',
        pathname: path.substr(reqBasePath.length) || '/',
        href: path.substr(reqBasePath.length) || '/'
      };

      request.setUrl(newUrl);
      contextCache.set(request, spaceUrlContext);
    }

    return reply.continue();
  });

  server.ext('onPostAuth', async function spacesOnRequestHandler(request, reply) {
    const path = request.path;

    const isRequestingKibanaRoot = path === '/';
    const urlContext = contextCache.get(request);
    const { [SELECTED_SPACE_COOKIE]: selectedSpace } = request.state;

    // if requesting the application root, then show the Space Selector UI to allow the user to choose which space
    // they wish to visit. This is done "onPostAuth" to allow the Saved Objects Client to use the request's auth scope,
    // which is not available at the time of "onRequest".
    if (isRequestingKibanaRoot && !urlContext) {
      try {

        const client = request.getSavedObjectsClient();
        const { total, saved_objects: spaceObjects } = await client.find({
          type: 'space'
        });

        const config = server.config();
        const basePath = config.get('server.basePath');
        const defaultRoute = config.get('server.defaultRoute');

        if (total === 1) {
          // If only one space is available, then send user there directly.
          // No need for an interstitial screen where there is only one possible outcome.
          const space = spaceObjects[0];
          const {
            urlContext
          } = space.attributes;

          const destination = addSpaceUrlContext(basePath, urlContext, defaultRoute);
          setSelectedSpace(request, reply, urlContext);
          return reply.redirect(destination);
        }

        if (total > 0) {
          const preferredSpace = spaceObjects.find(so => so.attributes.urlContext === selectedSpace);
          // If the user's previously selected space is still available, then send them there automatically
          if (preferredSpace) {
            const destination = addSpaceUrlContext(basePath, preferredSpace.attributes.urlContext, defaultRoute);
            return reply.redirect(destination);
          }

          // otherwise, render spaces selector instead of home page
          const app = server.getHiddenUiAppById('space_selector');
          return reply.renderApp(app, {
            spaces: spaceObjects.map(so => ({ ...so.attributes, id: so.id }))
          });
        }

      } catch (e) {
        return reply(wrapError(e));
      }
    }

    setSelectedSpace(request, reply, urlContext);

    return reply.continue();
  });
}
