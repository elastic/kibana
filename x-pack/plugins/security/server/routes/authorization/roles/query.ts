/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../..';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

interface QueryClause {
  [key: string]: any;
}

export function defineQueryRolesRoutes({
  router,
  authz,
  getFeatures,
  logger,
  buildFlavor,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/security/role/_query',
      options: {
        summary: `Query roles`,
      },
      validate: {
        body: schema.object({
          query: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          from: schema.maybe(schema.number()),
          size: schema.maybe(schema.number()),
          sort: schema.maybe(
            schema.object({
              field: schema.string(),
              direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
            })
          ),
          filters: schema.maybe(
            schema.object({
              showReserved: schema.maybe(schema.boolean({ defaultValue: true })),
            })
          ),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const hideReservedRoles =
          buildFlavor === 'serverless' || request.body.filters?.showReserved === false;
        const esClient = (await context.core).elasticsearch.client;
        const features = await getFeatures();
        const [elasticsearchRoles] = await Promise.all([
          await esClient.asCurrentUser.security.getRole(),
        ]);

        const { query, size, from, sort, filters } = request.body;

        let showReservedRoles = filters?.showReserved;

        if (buildFlavor === 'serverless') {
          showReservedRoles = false;
        }

        const queryPayload: {
          bool: { must: QueryClause[]; should: QueryClause[]; must_not: QueryClause[] };
        } = { bool: { must: [], should: [], must_not: [] } };

        if (query) {
          queryPayload.bool.must.push(query);
        }

        queryPayload.bool.should.push({ term: { 'metadata._reserved': showReservedRoles } });

        const transformedSort = sort && [{ [sort.field]: { order: sort.direction } }];
        const queryRoles = await esClient.asCurrentUser.transport.request({
          path: '/_security/_query/role',
          method: 'POST',
          body: {
            query: queryPayload,
            from,
            size,
            sort: transformedSort,
          },
        });

        // Transform elasticsearch roles into Kibana roles and return in a list sorted by the role name.
        return response.ok({
          // @ts-expect-error
          body: queryRoles,
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
