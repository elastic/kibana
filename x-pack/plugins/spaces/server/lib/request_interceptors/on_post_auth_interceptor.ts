/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger, CoreSetup } from 'src/core/server';
import { wrapError } from '../errors';
import { SpacesServiceSetup } from '../../spaces_service/spaces_service';
import { PluginsSetup } from '../../plugin';
import { getSpaceSelectorUrl } from '../get_space_selector_url';
import { DEFAULT_SPACE_ID, ENTER_SPACE_PATH } from '../../../common/constants';
import { addSpaceIdToPath } from '../../../common';

export interface OnPostAuthInterceptorDeps {
  http: CoreSetup['http'];
  features: PluginsSetup['features'];
  spacesService: SpacesServiceSetup;
  log: Logger;
}

export function initSpacesOnPostAuthRequestInterceptor({
  features,
  spacesService,
  log,
  http,
}: OnPostAuthInterceptorDeps) {
  http.registerOnPostAuth(async (request, response, toolkit) => {
    const serverBasePath = http.basePath.serverBasePath;

    const path = request.url.pathname!;

    const spaceId = spacesService.getSpaceId(request);

    // The root of kibana is also the root of the defaut space,
    // since the default space does not have a URL Identifier (i.e., `/s/foo`).
    const isRequestingKibanaRoot = path === '/' && spaceId === DEFAULT_SPACE_ID;
    const isRequestingSpaceRoot = path === '/' && spaceId !== DEFAULT_SPACE_ID;

    const spacesClient = await spacesService.scopedClient(request);

    // if requesting the application root, then show the Space Selector UI to allow the user to choose which space
    // they wish to visit. This is done "onPostAuth" to allow the Saved Objects Client to use the request's auth credentials,
    // which is not available at the time of "onRequest".
    if (isRequestingKibanaRoot) {
      try {
        const spaces = await spacesClient.getAll();

        if (spaces.length === 1) {
          // If only one space is available, then send user there directly.
          // No need for an interstitial screen where there is only one possible outcome.
          const space = spaces[0];

          const destination = addSpaceIdToPath(serverBasePath, space.id, ENTER_SPACE_PATH);
          return response.redirected({ headers: { location: destination } });
        }

        if (spaces.length > 0) {
          // render spaces selector instead of home page
          return response.redirected({
            headers: { location: getSpaceSelectorUrl(serverBasePath) },
          });
        }
      } catch (error) {
        return response.customError(wrapError(error));
      }
    } else if (isRequestingSpaceRoot) {
      const destination = addSpaceIdToPath(serverBasePath, spaceId, ENTER_SPACE_PATH);
      return response.redirected({ headers: { location: destination } });
    }

    return toolkit.next();
  });
}
