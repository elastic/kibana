/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { Space } from '../../../common/model/space';
import { wrapError } from '../errors';
import { getSpaceSelectorUrl } from '../get_space_selector_url';
import { addSpaceIdToPath, getSpaceIdFromPath } from '../spaces_url_parser';
import { InterceptorDeps } from '.';

export function initSpacesOnPostAuthRequestInterceptor({
  config,
  legacyServer,
  xpackMain,
  spacesService,
  log,
}: InterceptorDeps) {
  const serverBasePath: string = config.get('server.basePath');

  legacyServer.ext('onPostAuth', async function spacesOnPostAuthHandler(request: any, h: any) {
    const path = request.path;

    const isRequestingKibanaRoot = path === '/';
    const isRequestingApplication = path.startsWith('/app');

    const spacesClient = spacesService.scopedClient(request);

    // if requesting the application root, then show the Space Selector UI to allow the user to choose which space
    // they wish to visit. This is done "onPostAuth" to allow the Saved Objects Client to use the request's auth scope,
    // which is not available at the time of "onRequest".
    if (isRequestingKibanaRoot) {
      try {
        const spaces = await spacesClient.getAll();

        const basePath: string = config.get('server.basePath');
        const defaultRoute: string = config.get('server.defaultRoute');

        if (spaces.length === 1) {
          // If only one space is available, then send user there directly.
          // No need for an interstitial screen where there is only one possible outcome.
          const space = spaces[0];

          const destination = addSpaceIdToPath(basePath, space.id, defaultRoute);
          return h.redirect(destination).takeover();
        }

        if (spaces.length > 0) {
          // render spaces selector instead of home page
          const app = legacyServer.getHiddenUiAppById('space_selector');
          return (await h.renderApp(app, { spaces })).takeover();
        }
      } catch (error) {
        return wrapError(error);
      }
    }

    // This condition should only happen after selecting a space, or when transitioning from one application to another
    // e.g.: Navigating from Dashboard to Timelion
    if (isRequestingApplication) {
      let spaceId: string = '';
      let space: Space;
      try {
        spaceId = getSpaceIdFromPath(request.getBasePath(), serverBasePath);

        log.debug(`Verifying access to space "${spaceId}"`);

        space = await spacesClient.get(spaceId);
      } catch (error) {
        log.error(
          `Unable to navigate to space "${spaceId}", redirecting to Space Selector. ${error}`
        );
        // Space doesn't exist, or user not authorized for space, or some other issue retrieving the active space.
        return h.redirect(getSpaceSelectorUrl(config)).takeover();
      }

      // Verify application is available in this space
      // The management page is always visible, so we shouldn't be restricting access to the kibana application in any situation.
      const appId = path.split('/', 3)[2];
      if (appId !== 'kibana' && space && space.disabledFeatures.length > 0) {
        log.debug(`Verifying application is available: "${appId}"`);

        const allFeatures = xpackMain.getFeatures();

        const isRegisteredApp = allFeatures.some(feature => feature.app.includes(appId));
        if (isRegisteredApp) {
          const enabledFeatures = allFeatures.filter(
            feature => !space.disabledFeatures.includes(feature.id)
          );

          const isAvailableInSpace = enabledFeatures.some(feature => feature.app.includes(appId));
          if (!isAvailableInSpace) {
            log.error(`App ${appId} is not enabled within space "${spaceId}".`);
            return Boom.notFound();
          }
        }
      }
    }
    return h.continue;
  });
}
