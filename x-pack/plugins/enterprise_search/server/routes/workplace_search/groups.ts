/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

import { IRouteDependencies } from '../../plugin';

import { IMeta } from '../../../common/types';
import { IUser, IContentSource, IGroup } from '../../../common/types/workplace_search';

export function registerGroupsRoute({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/groups',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org/groups',
      hasValidData: (body: { users: IUser[]; contentSources: IContentSource[] }) =>
        typeof Array.isArray(body?.users) && typeof Array.isArray(body?.contentSources),
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
        hasValidData: (body: { created_at: string }) => typeof body?.created_at === 'string',
      })(context, request, response);
    }
  );
}

export function registerSearchGroupsRoute({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
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
        hasValidData: (body: { results: IGroup[]; meta: IMeta }) =>
          typeof Array.isArray(body?.results) &&
          typeof body?.meta?.page?.total_results === 'number',
      })(context, request, response);
    }
  );
}

export function registerGroupRoute({ router, enterpriseSearchRequestHandler }: IRouteDependencies) {
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
        hasValidData: (body: IGroup) =>
          typeof body?.createdAt === 'string' && typeof body?.usersCount === 'number',
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
        hasValidData: (body: IGroup) =>
          typeof body?.createdAt === 'string' && typeof body?.usersCount === 'number',
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
        hasValidData: (body: { deleted: boolean }) => body?.deleted === true,
      })(context, request, response);
    }
  );
}

export function registerGroupUsersRoute({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
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
        hasValidData: (body: IUser[]) => typeof Array.isArray(body),
      })(context, request, response);
    }
  );
}

export function registerShareGroupRoute({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
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
        hasValidData: (body: IGroup) =>
          typeof body?.createdAt === 'string' && typeof body?.usersCount === 'number',
      })(context, request, response);
    }
  );
}

export function registerAssignGroupRoute({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
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
        hasValidData: (body: IGroup) =>
          typeof body?.createdAt === 'string' && typeof body?.usersCount === 'number',
      })(context, request, response);
    }
  );
}

export function registerBoostsGroupRoute({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
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
        hasValidData: (body: IGroup) =>
          typeof body?.createdAt === 'string' && typeof body?.usersCount === 'number',
      })(context, request, response);
    }
  );
}
