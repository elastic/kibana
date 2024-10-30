/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerGroupsRoute({ router, enterpriseSearchRequestHandler }: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/groups',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups',
    })
  );

  router.post(
    {
      path: '/internal/workplace_search/groups',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({
          group_name: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups',
    })
  );
}

export function registerSearchGroupsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/groups/search',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({
          page: schema.object({
            current: schema.number(),
            size: schema.number(),
          }),
          search: schema.object({
            query: schema.string(),
            content_source_ids: schema.arrayOf(schema.string()),
          }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups/search',
    })
  );
}

export function registerGroupRoute({ router, enterpriseSearchRequestHandler }: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/groups/{id}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups/:id',
    })
  );

  router.put(
    {
      path: '/internal/workplace_search/groups/{id}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          group: schema.object({
            name: schema.string(),
          }),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups/:id',
    })
  );

  router.delete(
    {
      path: '/internal/workplace_search/groups/{id}',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups/:id',
    })
  );
}

export function registerGroupUsersRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/workplace_search/groups/{id}/group_users',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups/:id/group_users',
    })
  );
}

export function registerShareGroupRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/workplace_search/groups/{id}/share',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          content_source_ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups/:id/share',
    })
  );
}

export function registerBoostsGroupRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/internal/workplace_search/groups/{id}/boosts',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          content_source_boosts: schema.arrayOf(
            schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))
          ),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups/:id/update_source_boosts',
    })
  );
}

export const registerGroupsRoutes = (dependencies: RouteDependencies) => {
  registerGroupsRoute(dependencies);
  registerSearchGroupsRoute(dependencies);
  registerGroupRoute(dependencies);
  registerGroupUsersRoute(dependencies);
  registerShareGroupRoute(dependencies);
  registerBoostsGroupRoute(dependencies);
};
