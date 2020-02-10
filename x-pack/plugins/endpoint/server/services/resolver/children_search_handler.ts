/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { BaseSearchHandler, ParentAndResolverData } from './search_handler';
import { ResolverData, ResolverChildrenResponse, ResolverResultNode } from '../../../common/types';
import { ResolverDataHit, PaginationInfo, isLegacyEntityID, parseLegacyEntityID } from './common';
import { Total, EndpointAppContext, JSONish } from '../../types';

export class ChildrenSearchHandler extends BaseSearchHandler {
  private buildLegacyChildrenQuery(endpointID: string, uniquePID: string) {
    return {
      bool: {
        filter: {
          bool: {
            should: [
              {
                bool: {
                  filter: [
                    {
                      term: { 'endgame.unique_pid': uniquePID },
                    },
                    {
                      // had to change these to match queries otherwise I can't get results back, using the kibana
                      // developer mode it works fine AND the api tests when it's also a term...not sure why
                      match: { 'agent.id': endpointID },
                    },
                  ],
                },
              },
              {
                bool: {
                  filter: [
                    {
                      term: { 'endgame.unique_ppid': uniquePID },
                    },
                    {
                      match: { 'agent.id': endpointID },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    };
  }

  private buildESEndpointChildrenQuery(entityID: string) {
    return {
      bool: {
        filter: {
          bool: {
            should: [
              {
                match: { 'endpoint.process.entity_id': entityID },
              },
              {
                match: { 'endpoint.process.parent.entity_id': entityID },
              },
            ],
          },
        },
      },
    };
  }

  async getESChildrenQuery(
    context: EndpointAppContext,
    entityID: string,
    paginationInfo: PaginationInfo
  ) {
    const index = this.getIndex(entityID);
    const query = this.getESChildrenCountQuery(entityID);
    return await this.buildSearchBody(context, query, paginationInfo, index);
  }

  getESChildrenCountQuery(entityID: string): JSONish {
    if (isLegacyEntityID(entityID)) {
      const { endpointID, uniquePID } = parseLegacyEntityID(entityID);
      return this.buildLegacyChildrenQuery(endpointID, uniquePID);
    }
    return this.buildESEndpointChildrenQuery(entityID);
  }

  public async buildResponse(
    hits: ResolverDataHit[],
    total: Total
  ): Promise<ResolverChildrenResponse> {
    const nodes = new Map<string, ParentAndResolverData>();
    const originEvents: ResolverData[] = [];
    // it is possible that at this position in the pagination we won't have any events for the origin
    // yet so just return null for those related fields
    let originParentEntityID: string | undefined;
    for (const hit of hits) {
      const node = BaseSearchHandler.nodeCreator(hit._source);
      if (node.entityID === this.entityID) {
        originEvents.push(node.esData);
        originParentEntityID = node.parentEntityID;
      } else {
        const parentAndData = nodes.get(node.entityID) || {
          parentEntityID: node.parentEntityID,
          events: [],
        };

        parentAndData.events.push(node.esData);
        nodes.set(node.entityID, parentAndData);
      }
    }
    const children: ResolverResultNode[] = [];
    for (const [entityID, parentAndData] of nodes) {
      children.push({
        entity_id: entityID,
        parent_entity_id: parentAndData.parentEntityID,
        events: parentAndData.events,
      });
    }

    const pagination = await this.buildPagination(
      // total is an object in kibana >=7.0
      // see https://github.com/elastic/kibana/issues/56694
      total
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
}
