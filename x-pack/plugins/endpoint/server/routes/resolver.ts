/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandlerContext } from 'kibana/server';
import { SearchResponse, CountResponse } from 'elasticsearch';
import { schema } from '@kbn/config-schema';
import {
  ResolverPhase0Data,
  ResolverPhase1Data,
  ResolverData,
  ResolverChildrenResponse,
  ResolverResponseNode,
  ResolverNodeDetailsResponse,
} from '../../common/types';
import { EndpointAppContext } from '../types';
import { ResolverNode } from '../services/resolver/common';
import { ResolverPhase0Node } from '../services/resolver/phase0_node';
import { ResolverPhase1Node } from '../services/resolver/phase1_node';
import {
  getESChildrenQuery,
  getESNodeQuery,
  getPagination,
  PaginationInfo,
  getESChildrenCountQuery,
  getESNodeCountQuery,
} from '../services/resolver/query_builder';

function isPhase0Data(data: ResolverPhase0Data | ResolverPhase1Data): data is ResolverPhase0Data {
  return (data as ResolverPhase0Data).endgame?.unique_pid !== undefined;
}

interface ParentAndResolverData {
  parentEntityID: string;
  events: ResolverData[];
}

interface Total {
  value: number;
  relation: string;
}

class ResolverSearchHandler {
  constructor(
    private readonly reqContext: RequestHandlerContext,
    private readonly endpointContext: EndpointAppContext,
    private readonly pageInfo: PaginationInfo,
    private readonly countQuery: any,
    private readonly entityID: string
  ) {}

  private static nodeCreator(data: ResolverData): ResolverNode {
    if (isPhase0Data(data)) {
      return new ResolverPhase0Node(data);
    }
    return new ResolverPhase1Node(data);
  }
  private async buildPagination(total: Total) {
    const { page, pageSize, from } = await getPagination(this.endpointContext, this.pageInfo);
    let amount = total.value;
    if (total.relation === 'gte') {
      // perform count
      try {
        const response = (await this.reqContext.core.elasticsearch.dataClient.callAsCurrentUser(
          'count',
          this.countQuery
        )) as CountResponse;
        amount = response.count;
      } catch (e) {
        throw new Error(`Failed to retrieve count: ${e}`);
      }
    }
    return {
      total: amount,
      request_page_index: page,
      request_page_size: pageSize,
      request_from_index: from,
    };
  }

  public async buildChildrenResponse(
    esResponse: SearchResponse<ResolverData>
  ): Promise<ResolverChildrenResponse> {
    const nodes = new Map<string, ParentAndResolverData>();
    const originEvents: ResolverData[] = [];
    // handle the case where the origin didn't come back for some reason
    let originParentEntityID: string | undefined;
    for (const hit of esResponse.hits.hits) {
      const node = ResolverSearchHandler.nodeCreator(hit._source);
      const parentAndData = nodes.get(node.entityID) || {
        parentEntityID: node.parentEntityID,
        events: [],
      };

      parentAndData.events.push(node.esData);
      nodes.set(node.entityID, parentAndData);
      if (node.entityID === this.entityID) {
        originEvents.push(node.esData);
        originParentEntityID = node.parentEntityID;
      }
    }
    const children: ResolverResponseNode[] = [];
    for (const [entityID, parentAndData] of nodes) {
      children.push({
        entity_id: entityID,
        parent_entity_id: parentAndData.parentEntityID,
        events: parentAndData.events,
      });
    }
    if (originParentEntityID === undefined) {
      throw new Error('Unable to find origin information');
    }
    const pagination = await this.buildPagination(
      // total is an object in kibana >=7.0
      // see https://github.com/elastic/kibana/issues/56694
      (esResponse.hits.total as unknown) as Total
    );
    return {
      origin: {
        parent_entity_id: originParentEntityID,
        entity_id: this.entityID,
        events: originEvents,
      },
      children,
      ...pagination,
    };
  }

  public async buildNodeResponse(
    esResponse: SearchResponse<ResolverData>
  ): Promise<ResolverNodeDetailsResponse> {
    const events: ResolverData[] = [];
    let parentEntityID: string | undefined;
    // there could be multiple events for a single event id because process creation, termination etc will all have the
    // same entity id
    for (const hit of esResponse.hits.hits) {
      const node = ResolverSearchHandler.nodeCreator(hit._source);
      events.push(node.esData);
      parentEntityID = node.parentEntityID;
    }

    if (parentEntityID === undefined) {
      throw new Error('Unable to find origin information');
    }
    const pagination = await this.buildPagination(
      // total is an object in kibana >=7.0
      // see https://github.com/elastic/kibana/issues/56694
      (esResponse.hits.total as unknown) as Total
    );
    return {
      node: {
        parent_entity_id: parentEntityID,
        entity_id: this.entityID,
        events,
      },
      ...pagination,
    };
  }
}

export function registerResolverRoutes(router: IRouter, endpointAppContext: EndpointAppContext) {
  const validateObject = {
    query: schema.object({
      page_size: schema.number({ min: 1, max: 1000 }),
      page_index: schema.number({ min: 0 }),
      entityID: schema.string(),
    }),
  };

  router.get(
    {
      path: '/api/endpoint/resolver/children',
      validate: validateObject,
      options: { authRequired: true },
    },
    async (context, req, res) => {
      const entityID = req.query.entityID;
      const paginationInfo = {
        page: req.query?.page_index,
        pageSize: req.query?.page_size,
      };
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
          context,
          endpointAppContext,
          paginationInfo,
          getESChildrenCountQuery(entityID),
          entityID
        );
        return res.ok({
          body: await handler.buildChildrenResponse(response),
        });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );

  router.get(
    {
      path: '/api/endpoint/resolver/node',
      validate: validateObject,
      options: { authRequired: true },
    },
    async (context, req, res) => {
      const entityID = req.query.entityID;
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
          context,
          endpointAppContext,
          paginationInfo,
          getESNodeCountQuery(entityID),
          entityID
        );
        return res.ok({
          body: await handler.buildNodeResponse(response),
        });
      } catch (err) {
        return res.internalError({ body: err });
      }
    }
  );
}
