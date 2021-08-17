/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

const MAX_IMAGE_BYTES = 2000000;

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

export function registerOrgSettingsUploadImagesRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/api/workplace_search/org/settings/upload_images',
      validate: {
        body: schema.object({
          logo: schema.maybe(schema.nullable(schema.string())),
          icon: schema.maybe(schema.nullable(schema.string())),
        }),
      },
      options: {
        body: {
          maxBytes: MAX_IMAGE_BYTES,
        },
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/settings/upload_images',
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
  registerOrgSettingsUploadImagesRoute(dependencies);
  registerOrgSettingsOauthApplicationRoute(dependencies);
};
