/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IRouter,
  ResponseError,
  Logger,
  RequestHandler,
  IScopedClusterClient,
  KibanaResponseFactory,
  IKibanaResponse,
} from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';

import { EndpointAppContext, Total, JSONish } from '../types';
import {
  getESChildrenQuery,
  getESNodeQuery,
  getESChildrenCountQuery,
  getESNodeCountQuery,
  PaginationInfo,
} from '../services/resolver/query_builder';
import { BaseSearchHandler } from '../services/resolver/search_handler';
import { ResolverData } from '../../common/types';
import { EntityParseError, CountQueryInfo } from '../services/resolver/common';
import { ChildrenSearchHandler } from '../services/resolver/children_search_handler';
import { SingleNodeHandler } from '../services/resolver/single_node_handler';

interface ResolverRequestParams {
  page_index?: number;
  page_size?: number;
  entity_id: string;
}

type SearchQueryBuilder = (
  endpointContext: EndpointAppContext,
  entityID: string,
  paginationInfo: PaginationInfo
) => Promise<JSONish>;

type CountQueryBuilder = (entityID: string) => CountQueryInfo;

type SearchHandlerCreator = (
  client: IScopedClusterClient,
  endpointContext: EndpointAppContext,
  pageInfo: PaginationInfo,
  countQuery: JSONish,
  entityID: string
) => BaseSearchHandler;

function createChildrenSearchHandler(
  client: IScopedClusterClient,
  endpointContext: EndpointAppContext,
  pageInfo: PaginationInfo,
  countQuery: JSONish,
  entityID: string
) {
  return new ChildrenSearchHandler(client, endpointContext, pageInfo, countQuery, entityID);
}

function createSingleNodeHandler(
  client: IScopedClusterClient,
  endpointContext: EndpointAppContext,
  pageInfo: PaginationInfo,
  countQuery: JSONish,
  entityID: string
) {
  return new SingleNodeHandler(client, endpointContext, pageInfo, countQuery, entityID);
}

function getReqHandler(
  searchQueryBuilder: SearchQueryBuilder,
  countQueryBuilder: CountQueryBuilder,
  debugQueryString: string,
  notFoundString: string,
  log: Logger,
  endpointAppContext: EndpointAppContext,
  handlerCreator: SearchHandlerCreator
): RequestHandler<unknown, ResolverRequestParams> {
  return async (context, req, res) => {
    const entityID = req.query.entity_id;
    log.debug(`entity_id: ${entityID}`);
    const paginationInfo = {
      page: req.query?.page_index,
      pageSize: req.query?.page_size,
    } as PaginationInfo;
    try {
      const query = await searchQueryBuilder(endpointAppContext, entityID, paginationInfo);
      log.debug(`${debugQueryString} ${JSON.stringify(query)}`);
      const response = (await context.core.elasticsearch.dataClient.callAsCurrentUser(
        'search',
        query
      )) as SearchResponse<ResolverData>;

      if (response.hits.hits.length === 0) {
        return res.notFound({ body: `${notFoundString}` });
      }
      const countQuery = countQueryBuilder(entityID).query;
      const handler = handlerCreator(
        context.core.elasticsearch.dataClient,
        endpointAppContext,
        paginationInfo,
        countQuery,
        entityID
      );
      return res.ok({
        body: await handler.buildResponse(
          response.hits.hits,
          // total is an object in kibana >=7.0 so cast it to an object
          // see https://github.com/elastic/kibana/issues/56694
          (response.hits.total as unknown) as Total
        ),
      });
    } catch (err) {
      return handleError(res, log, err);
    }
  };
}

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const log = endpointAppContext.logFactory.get('resolver');
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
    getReqHandler(
      getESChildrenQuery,
      getESChildrenCountQuery,
      'resolver/children query:',
      'Nodes not found',
      log,
      endpointAppContext,
      createChildrenSearchHandler
    )
  );

  router.get(
    {
      path: '/api/endpoint/resolver/node',
      validate: {
        query: validateQueryObject,
      },
      options: { authRequired: true },
    },
    getReqHandler(
      getESNodeQuery,
      getESNodeCountQuery,
      'resolver/node query:',
      'Node not found',
      log,
      endpointAppContext,
      createSingleNodeHandler
    )
  );
}

function handleError(
  res: KibanaResponseFactory,
  log: Logger,
  err: any
): IKibanaResponse<ResponseError> {
  log.warn(err);
  if (EntityParseError.isEntityParseError(err)) {
    return res.badRequest({ body: err });
  }
  return res.internalError({ body: err });
}
