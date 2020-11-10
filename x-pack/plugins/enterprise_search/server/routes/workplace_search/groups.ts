/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerGroupsRoute({ router, enterpriseSearchRequestHandler }: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/groups',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups',
    })
  );

  router.post(
    {
      path: '/api/workplace_search/groups',
      validate: {
        body: schema.object({
          group_name: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/org/groups',
        body: request.body,
      })(context, request, response);
    }
  );
}

export function registerSearchGroupsRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workplace_search/groups/search',
      validate: {
        body: schema.object({
          page: schema.object({
            current: schema.number(),
            size: schema.number(),
          }),
          search: schema.object({
            query: schema.string(),
            content_source_ids: schema.arrayOf(schema.string()),
            user_ids: schema.arrayOf(schema.string()),
          }),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: '/ws/org/groups/search',
        body: request.body,
      })(context, request, response);
    }
  );
}

export function registerGroupRoute({ router, enterpriseSearchRequestHandler }: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/groups/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/groups/${request.params.id}`,
      })(context, request, response);
    }
  );

  router.put(
    {
      path: '/api/workplace_search/groups/{id}',
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/groups/${request.params.id}`,
        body: request.body,
      })(context, request, response);
    }
  );

  router.delete(
    {
      path: '/api/workplace_search/groups/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/groups/${request.params.id}`,
      })(context, request, response);
    }
  );
}

export function registerGroupUsersRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/groups/{id}/group_users',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/groups/${request.params.id}/group_users`,
      })(context, request, response);
    }
  );
}

export function registerShareGroupRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workplace_search/groups/{id}/share',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          content_source_ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/groups/${request.params.id}/share`,
        body: request.body,
      })(context, request, response);
    }
  );
}

export function registerAssignGroupRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workplace_search/groups/{id}/assign',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          user_ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/groups/${request.params.id}/assign`,
        body: request.body,
      })(context, request, response);
    }
  );
}

export function registerBoostsGroupRoute({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.put(
    {
      path: '/api/workplace_search/groups/{id}/boosts',
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
    async (context, request, response) => {
      return enterpriseSearchRequestHandler.createRequest({
        path: `/ws/org/groups/${request.params.id}/update_source_boosts`,
        body: request.body,
      })(context, request, response);
    }
  );
}

export const registerGroupsRoutes = (dependencies: IRouteDependencies) => {
  registerGroupsRoute(dependencies);
  registerSearchGroupsRoute(dependencies);
  registerGroupRoute(dependencies);
  registerGroupUsersRoute(dependencies);
  registerShareGroupRoute(dependencies);
  registerAssignGroupRoute(dependencies);
  registerBoostsGroupRoute(dependencies);
};
