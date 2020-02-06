/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import { EndpointAppContext, Total } from '../types';
import {
  getESChildrenQuery,
  getESNodeQuery,
  getESChildrenCountQuery,
  getESNodeCountQuery,
  PaginationInfo,
} from '../services/resolver/query_builder';
import { ResolverSearchHandler } from '../services/resolver/search_handler';
import { ResolverData } from '../../common/types';
import { EntityParseError } from '../services/resolver/common';

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('resolver-route');
  const validateQueryObject = schema.object({
    page_size: schema.maybe(schema.number({ min: 1, max: 1000 })),
    page_index: schema.maybe(schema.number({ min: 0 })),
    entity_id: schema.string(),
  });

  router.get(
    {
      path: '/api/endpoint/resolver/children',
      validate: {
        query: validateQueryObject,
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      const entityID = req.query.entity_id;
      const paginationInfo = {
        page: req.query?.page_index,
        pageSize: req.query?.page_size,
      } as PaginationInfo;
      try {
        const query = await getESChildrenQuery(endpointAppContext, entityID, paginationInfo);
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          query
        )) as SearchResponse<ResolverData>;

        if (response.hits.hits.length === 0) {
          return res.notFound({ body: 'Nodes not found' });
        }
        const handler = new ResolverSearchHandler(
          context.core.elasticsearch.dataClient,
          endpointAppContext,
          paginationInfo,
          getESChildrenCountQuery(entityID),
          entityID
        );
        return res.ok({
          body: await handler.buildChildrenResponse(
            response.hits.hits,
            // total is an object in kibana >=7.0 so cast it to an object
            // see https://github.com/elastic/kibana/issues/56694
            (response.hits.total as unknown) as Total
          ),
        });
      } catch (err) {
        log.warn(JSON.stringify(err));
        if (EntityParseError.isEntityParseError(err)) {
          return res.badRequest({ body: err });
        }
        return res.internalError({ body: err });
      }
    }
  );

  router.get(
    {
      path: '/api/endpoint/resolver/node',
      validate: {
        query: validateQueryObject,
      },
      options: { authRequired: true },
    },
    async (context, req, res) => {
      const entityID = req.query.entity_id;
      const paginationInfo = {
        page: req.query?.page_index,
        pageSize: req.query?.page_size,
      };
      try {
        const query = await getESNodeQuery(endpointAppContext, entityID, paginationInfo);
        const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
          'search',
          query
        )) as SearchResponse<ResolverData>;
        if (response.hits.hits.length === 0) {
          return res.notFound({ body: 'Node not found' });
        }
        const handler = new ResolverSearchHandler(
          context.core.elasticsearch.dataClient,
          endpointAppContext,
          paginationInfo,
          getESNodeCountQuery(entityID),
          entityID
        );
        return res.ok({
          body: await handler.buildNodeResponse(
            response.hits.hits,
            // total is an object in kibana >=7.0 so cast it to an object
            // see https://github.com/elastic/kibana/issues/56694
            (response.hits.total as unknown) as Total
          ),
        });
      } catch (err) {
        log.warn(JSON.stringify(err));
        if (EntityParseError.isEntityParseError(err)) {
          return res.badRequest({ body: err });
        }
        return res.internalError({ body: err });
      }
    }
  );
}
