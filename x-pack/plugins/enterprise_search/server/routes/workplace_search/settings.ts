/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerOrgSettingsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/org/settings',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings',
    })
  );
}

export function registerOrgSettingsCustomizeRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/api/workplace_search/org/settings/customize',
      validate: {
        body: schema.object({
          name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/customize',
    })
  );
}

export function registerOrgSettingsOauthApplicationRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/api/workplace_search/org/settings/oauth_application',
      validate: {
        body: schema.object({
          oauth_application: schema.object({
            name: schema.string(),
            confidential: schema.boolean(),
            redirect_uri: schema.string(),
          }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/oauth_application',
    })
  );
}

export const registerSettingsRoutes = (dependencies: RouteDependencies) => {
  registerOrgSettingsRoute(dependencies);
  registerOrgSettingsCustomizeRoute(dependencies);
  registerOrgSettingsOauthApplicationRoute(dependencies);
};
