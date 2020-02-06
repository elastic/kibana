/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IScopedClusterClient } from 'kibana/server';
import { CountResponse } from 'elasticsearch';
import {
  ResolverPhase0Data,
  ResolverPhase1Data,
  ResolverData,
  ResolverChildrenResponse,
  ResolverResponseNode,
  ResolverNodeDetailsResponse,
  Pagination,
} from '../../../common/types';
import { EndpointAppContext } from '../../types';
import { ResolverNode, ResolverDataHit, Query } from './common';
import { ResolverPhase0Node } from './phase0_node';
import { ResolverPhase1Node } from './phase1_node';
import { getPagination, PaginationInfo } from './query_builder';

interface ParentAndResolverData {
  parentEntityID: string;
  events: ResolverData[];
}

export interface Total {
  value: number;
  relation: string;
}

export class ResolverSearchHandler {
  constructor(
    private readonly client: IScopedClusterClient,
    private readonly endpointContext: EndpointAppContext,
    private readonly pageInfo: PaginationInfo,
    private readonly countQuery: Query,
    private readonly entityID: string
  ) {}

  private static isPhase0Data(
    data: ResolverPhase0Data | ResolverPhase1Data
  ): data is ResolverPhase0Data {
    return (data as ResolverPhase0Data).endgame?.unique_pid !== undefined;
  }

  private static nodeCreator(data: ResolverData): ResolverNode {
    if (ResolverSearchHandler.isPhase0Data(data)) {
      return new ResolverPhase0Node(data);
    }
    return new ResolverPhase1Node(data);
  }
  private async buildPagination(total: Total): Promise<Pagination> {
    const { page, pageSize, from } = await getPagination(this.endpointContext, this.pageInfo);
    let amount = total.value;
    if (total.relation === 'gte') {
      // perform count
      try {
        const response = (await this.client.callAsCurrentUser(
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
    hits: ResolverDataHit[],
    total: Total
  ): Promise<ResolverChildrenResponse> {
    const nodes = new Map<string, ParentAndResolverData>();
    const originEvents: ResolverData[] = [];
    // it is possible that at this position in the pagination we won't have any events for the origin
    // yet so just return null for those related fields
    let originParentEntityID: string | undefined;
    for (const hit of hits) {
      const node = ResolverSearchHandler.nodeCreator(hit._source);
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
    const children: ResolverResponseNode[] = [];
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

  public async buildNodeResponse(
    hits: ResolverDataHit[],
    total: Total
  ): Promise<ResolverNodeDetailsResponse> {
    const events: ResolverData[] = [];
    let parentEntityID: string | undefined;
    // there could be multiple events for a single event id because process creation, termination etc will all have the
    // same entity id
    for (const hit of hits) {
      const node = ResolverSearchHandler.nodeCreator(hit._source);
      events.push(node.esData);
      parentEntityID = node.parentEntityID;
    }

    const pagination = await this.buildPagination(
      // total is an object in kibana >=7.0
      // see https://github.com/elastic/kibana/issues/56694
      total
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
