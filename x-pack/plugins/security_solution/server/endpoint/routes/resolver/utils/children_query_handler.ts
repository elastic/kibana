/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { entityId } from '../../../../../common/endpoint/models/event';
import {
  ResolverEvent,
  LifecycleNode,
  ResolverChildren,
} from '../../../../../common/endpoint/types';
import { ChildrenAncestryQuery } from '../queries/children_ancestry';
import { PaginationBuilder } from './pagination';
import { QueryInfo } from '../queries/multi_searcher';
import { QueryHandler } from './fetch';
import { LifecycleQuery } from '../queries/lifecycle';
import { createLifecycle, createChildren } from './node';

export class ChildrenQueryHandler implements QueryHandler<ResolverChildren> {
  private childrenStartEvents: string[] = [];
  private readonly childrenStartQuery: ChildrenAncestryQuery;
  private childrenNodesQuery: LifecycleQuery | undefined;
  private childrenNodes: ResolverChildren | undefined;
  constructor(
    private readonly limit: number,
    private readonly entityID: string,
    after: string | undefined,
    private readonly indexPattern: string,
    private readonly legacyEndpointID: string | undefined
  ) {
    this.childrenStartQuery = new ChildrenAncestryQuery(
      PaginationBuilder.createBuilder(limit, after),
      indexPattern,
      legacyEndpointID
    );
  }
  private static toMapOfNodes(results: ResolverEvent[]) {
    return results.reduce((nodes: Map<string, LifecycleNode>, event: ResolverEvent) => {
      const nodeId = entityId(event);
      let node = nodes.get(nodeId);
      if (!node) {
        node = createLifecycle(nodeId, []);
      }

      node.lifecycle.push(event);
      return nodes.set(nodeId, node);
    }, new Map());
  }

  handleStartEventsResponse = (response: SearchResponse<ResolverEvent>) => {
    this.childrenStartEvents = this.childrenStartQuery.formatResponse(response).map(entityId);
    this.childrenNodesQuery = new LifecycleQuery(this.indexPattern, this.legacyEndpointID);
  };

  handleNodesResponse = (response: SearchResponse<ResolverEvent>) => {
    if (!this.childrenNodesQuery) {
      return;
    }
    const nodes = [
      ...ChildrenQueryHandler.toMapOfNodes(
        this.childrenNodesQuery.formatResponse(response)
      ).values(),
    ];
    this.childrenNodes = createChildren(nodes, null);
  };

  buildQuery(): QueryInfo {
    if (!this.childrenNodesQuery) {
      return {
        query: this.childrenStartQuery,
        ids: this.entityID,
        handler: this.handleStartEventsResponse,
      };
    } else {
      return {
        query: this.childrenNodesQuery,
        ids: this.childrenStartEvents,
        handler: this.handleNodesResponse,
      };
    }
  }

  getResults() {
    return this.childrenNodes;
  }

  async search(client: IScopedClusterClient) {
    this.handleResponse(await this.query.search(client, this.entityID));
    return this.getResults();
  }
}
