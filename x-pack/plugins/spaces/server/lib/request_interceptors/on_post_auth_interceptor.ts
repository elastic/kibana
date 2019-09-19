/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger, CoreSetup } from 'src/core/server';
import { Space } from '../../../common/model/space';
import { wrapError } from '../errors';
import { addSpaceIdToPath } from '../spaces_url_parser';
import { SpacesServiceSetup } from '../../spaces_service/spaces_service';
import { LegacyAPI, PluginsSetup } from '../../plugin';
import { getSpaceSelectorUrl } from '../get_space_selector_url';
import { DEFAULT_SPACE_ID } from '../../../common/constants';

export interface OnPostAuthInterceptorDeps {
  getLegacyAPI(): LegacyAPI;
  http: CoreSetup['http'];
  features: PluginsSetup['features'];
  spacesService: SpacesServiceSetup;
  log: Logger;
}

export function initSpacesOnPostAuthRequestInterceptor({
  features,
  getLegacyAPI,
  spacesService,
  log,
  http,
}: OnPostAuthInterceptorDeps) {
  http.registerOnPostAuth(async (request, response, toolkit) => {
    const { serverBasePath, serverDefaultRoute } = getLegacyAPI().legacyConfig;

    const path = request.url.pathname!;

    const spaceId = spacesService.getSpaceId(request);

    // The root of kibana is also the root of the defaut space,
    // since the default space does not have a URL Identifier (i.e., `/s/foo`).
    const isRequestingKibanaRoot = path === '/' && spaceId === DEFAULT_SPACE_ID;
    const isRequestingApplication = path.startsWith('/app');

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

          const destination = addSpaceIdToPath(serverBasePath, space.id, serverDefaultRoute);
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
    }

    // This condition should only happen after selecting a space, or when transitioning from one application to another
    // e.g.: Navigating from Dashboard to Timelion
    if (isRequestingApplication) {
      let space: Space;
      try {
        log.debug(`Verifying access to space "${spaceId}"`);

        space = await spacesClient.get(spaceId);
      } catch (error) {
        log.error(
          `Unable to navigate to space "${spaceId}", redirecting to Space Selector. ${error}`
        );
        // Space doesn't exist, or user not authorized for space, or some other issue retrieving the active space.
        const result = response.redirected({
          headers: { location: getSpaceSelectorUrl(serverBasePath) },
        });
        return result;
      }

      // Verify application is available in this space
      // The management page is always visible, so we shouldn't be restricting access to the kibana application in any situation.
      const appId = path.split('/', 3)[2];
      if (appId !== 'kibana' && space && space.disabledFeatures.length > 0) {
        log.debug(`Verifying application is available: "${appId}"`);

        const allFeatures = features.getFeatures();

        const isRegisteredApp = allFeatures.some(feature => feature.app.includes(appId));
        if (isRegisteredApp) {
          const enabledFeatures = allFeatures.filter(
            feature => !space.disabledFeatures.includes(feature.id)
          );

          const isAvailableInSpace = enabledFeatures.some(feature => feature.app.includes(appId));

          if (!isAvailableInSpace) {
            log.error(`App ${appId} is not enabled within space "${spaceId}".`);
            return response.notFound();
          }
        }
      }
    }
    return toolkit.next();
  });
}
