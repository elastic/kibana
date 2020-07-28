/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import {
  parentEntityId,
  entityId,
  getAncestryAsArray,
} from '../../../../../common/endpoint/models/event';
import {
  ResolverAncestry,
  ResolverEvent,
  ResolverLifecycleNode,
} from '../../../../../common/endpoint/types';
import { createAncestry, createLifecycle } from './node';
import { LifecycleQuery } from '../queries/lifecycle';
import { QueryInfo } from '../queries/multi_searcher';
import { QueryHandler } from './fetch';

/**
 * Retrieve the ancestry portion of a resolver tree.
 */
export class AncestryQueryHandler implements QueryHandler<ResolverAncestry> {
  private readonly ancestry: ResolverAncestry = createAncestry();
  private ancestorsToFind: string[];
  private readonly query: LifecycleQuery;

  constructor(
    private levels: number,
    indexPattern: string,
    legacyEndpointID: string | undefined,
    originNode: ResolverLifecycleNode | undefined
  ) {
    this.ancestorsToFind = getAncestryAsArray(originNode?.lifecycle[0]).slice(0, levels);
    this.query = new LifecycleQuery(indexPattern, legacyEndpointID);

    // add the origin node to the response if it exists
    if (originNode) {
      this.ancestry.ancestors.push(originNode);
      this.ancestry.nextAncestor = parentEntityId(originNode.lifecycle[0]) || null;
    }
  }

  private toMapOfNodes(results: ResolverEvent[]) {
    return results.reduce((nodes: Map<string, ResolverLifecycleNode>, event: ResolverEvent) => {
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

  private handleResponse = (searchResp: SearchResponse<ResolverEvent>) => {
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
    this.ancestorsToFind = getAncestryAsArray(results[0]).slice(0, this.levels);
  };

  /**
   * Returns whether there are more results to retrieve based on the limit that is passed in and the results that
   * have already been received from ES.
   */
  hasMore(): boolean {
    return this.levels > 0 && this.ancestorsToFind.length > 0;
  }

  /**
   * Get a query info for retrieving the next set of results.
   */
  nextQuery(): QueryInfo | undefined {
    if (this.hasMore()) {
      return {
        query: this.query,
        ids: this.ancestorsToFind,
        handler: this.handleResponse,
      };
    }
  }

  /**
   * Return the results after using msearch to find them.
   */
  getResults() {
    return this.ancestry;
  }

  /**
   * Perform a regular search and return the results.
   *
   * @param client the elasticsearch client.
   */
  async search(client: ILegacyScopedClusterClient) {
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
