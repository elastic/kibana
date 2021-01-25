/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerSettingsRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/app_search/log_settings',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/log_settings',
    })
  );

  router.put(
    {
      path: '/api/app_search/log_settings',
      validate: {
        body: schema.object({
          api: schema.maybe(
            schema.object({
              enabled: schema.boolean(),
            })
          ),
          analytics: schema.maybe(
            schema.object({
              enabled: schema.boolean(),
            })
          ),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/log_settings',
    })
  );
}
