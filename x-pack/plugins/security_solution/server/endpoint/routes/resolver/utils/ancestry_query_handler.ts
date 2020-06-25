/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import {
  ancestryArray,
  parentEntityId,
  entityId,
} from '../../../../../common/endpoint/models/event';
import {
  ResolverAncestry,
  ResolverEvent,
  LifecycleNode,
} from '../../../../../common/endpoint/types';
import { createAncestry, createLifecycle } from './node';
import { LifecycleQuery } from '../queries/lifecycle';
import { QueryInfo } from '../queries/multi_searcher';
import { QueryHandler } from './fetch';

export class AncestryQueryHandler implements QueryHandler<ResolverAncestry> {
  private readonly ancestry: ResolverAncestry = createAncestry();
  private ancestorsToFind: string[];
  private readonly query: LifecycleQuery;

  constructor(
    private levels: number,
    indexPattern: string,
    legacyEndpointID: string | undefined,
    originNode: LifecycleNode | undefined
  ) {
    this.ancestorsToFind = AncestryQueryHandler.getAncestryAsArray(originNode?.lifecycle[0]).slice(
      0,
      levels
    );
    this.query = new LifecycleQuery(indexPattern, legacyEndpointID);

    // add the origin node to the response if it exists
    if (originNode) {
      this.ancestry.ancestors.push(originNode);
      this.ancestry.nextAncestor = parentEntityId(originNode.lifecycle[0]) || null;
    }
  }

  private static getAncestryAsArray(event: ResolverEvent | undefined): string[] {
    if (!event) {
      return [];
    }

    const ancestors = ancestryArray(event);
    if (ancestors) {
      return ancestors;
    }

    const parentID = parentEntityId(event);
    if (parentID) {
      return [parentID];
    }

    return [];
  }

  private toMapOfNodes(results: ResolverEvent[]) {
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

  private setNoMore() {
    this.ancestry.nextAncestor = null;
    this.ancestorsToFind = [];
    this.levels = 0;
  }

  handleResponse = (searchResp: SearchResponse<ResolverEvent>) => {
    const results = this.query.formatResponse(searchResp);
    if (results.length === 0) {
      this.setNoMore();
      return;
    }

    // bucket the start and end events together for a single node
    const ancestryNodes = this.toMapOfNodes(results);

    // the order of this array is going to be weird, it will look like this
    // [furthest grandparent...closer grandparent, next recursive call furthest grandparent...closer grandparent]
    this.ancestry.ancestors.push(...ancestryNodes.values());
    this.ancestry.nextAncestor = parentEntityId(results[0]) || null;
    this.levels = this.levels - ancestryNodes.size;
    // the results come back in ascending order on timestamp so the first entry in the
    // results should be the further ancestor (most distant grandparent)
    this.ancestorsToFind = AncestryQueryHandler.getAncestryAsArray(results[0]).slice(
      0,
      this.levels
    );
  };

  hasMore(): boolean {
    return this.levels > 0 && this.ancestorsToFind.length > 0;
  }

  nextQuery(): QueryInfo | undefined {
    if (this.hasMore()) {
      return {
        query: this.query,
        ids: this.ancestorsToFind,
        handler: this.handleResponse,
      };
    }
  }

  getResults() {
    return this.ancestry;
  }

  async search(client: IScopedClusterClient) {
    while (this.hasMore()) {
      const info = this.nextQuery();
      if (!info) {
        break;
      }
      this.handleResponse(await this.query.search(client, info.ids));
    }
    return this.getResults();
  }
}
