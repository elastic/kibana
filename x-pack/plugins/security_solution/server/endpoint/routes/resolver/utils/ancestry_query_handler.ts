/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import {
  parentEntityIDSafeVersion,
  entityIDSafeVersion,
  ancestry,
} from '../../../../../common/endpoint/models/event';
import {
  SafeResolverAncestry,
  SafeResolverEvent,
  SafeResolverLifecycleNode,
} from '../../../../../common/endpoint/types';
import { createAncestry, createLifecycle } from './node';
import { LifecycleQuery } from '../queries/lifecycle';
import { QueryInfo } from '../queries/multi_searcher';
import { QueryHandler } from './fetch';

/**
 * Retrieve the ancestry portion of a resolver tree.
 */
export class AncestryQueryHandler implements QueryHandler<SafeResolverAncestry> {
  private readonly ancestry: SafeResolverAncestry = createAncestry();
  private ancestorsToFind: string[];
  private readonly query: LifecycleQuery;

  constructor(
    private levels: number,
    indexPattern: string,
    legacyEndpointID: string | undefined,
    originNode: SafeResolverLifecycleNode | undefined
  ) {
    const event = originNode?.lifecycle[0];
    this.ancestorsToFind = (event ? ancestry(event) : []).slice(0, levels);
    this.query = new LifecycleQuery(indexPattern, legacyEndpointID);

    // add the origin node to the response if it exists
    if (originNode) {
      this.ancestry.ancestors.push(originNode);
      this.ancestry.nextAncestor = parentEntityIDSafeVersion(originNode.lifecycle[0]) || null;
    }
  }

  private toMapOfNodes(results: SafeResolverEvent[]) {
    return results.reduce(
      (nodes: Map<string, SafeResolverLifecycleNode>, event: SafeResolverEvent) => {
        const nodeId = entityIDSafeVersion(event);
        if (!nodeId) {
          return nodes;
        }

        let node = nodes.get(nodeId);
        if (!node) {
          node = createLifecycle(nodeId, []);
        }

        node.lifecycle.push(event);
        return nodes.set(nodeId, node);
      },
      new Map()
    );
  }

  private setNoMore() {
    this.ancestry.nextAncestor = null;
    this.ancestorsToFind = [];
    this.levels = 0;
  }

  private handleResponse = (searchResp: SearchResponse<SafeResolverEvent>) => {
    const results = this.query.formatResponse(searchResp);
    if (results.length === 0) {
      this.setNoMore();
      return;
    }

    // bucket the start and end events together for a single node
    const ancestryNodes = this.toMapOfNodes(results);

    /**
     * This array (this.ancestry.ancestors) is the accumulated ancestors of the node of interest. This array is different
     * from the ancestry array of a specific document. The order of this array is going to be weird, it will look like this
     * [most distant ancestor...closer ancestor, next recursive call most distant ancestor...closer ancestor]
     *
     * Here is an example of why this happens
     * Consider the following tree:
     * A -> B -> C -> D -> E -> Origin
     * Where A was spawn before B, which was before C, etc
     *
     * Let's assume the ancestry array limit is 2 so Origin's array would be: [E, D]
     * E's ancestry array would be: [D, C] etc
     *
     * If a request comes in to retrieve all the ancestors in this tree, the accumulate results will be:
     * [D, E, B, C, A]
     *
     * The first iteration would retrieve D and E in that order because they are sorted in ascending order by timestamp.
     * The next iteration would get the ancestors of D (since that's the most distant ancestor from Origin) which are
     * [B, C]
     * The next iteration would get the ancestors of B which is A
     * Hence: [D, E, B, C, A]
     */
    this.ancestry.ancestors.push(...ancestryNodes.values());
    this.ancestry.nextAncestor = parentEntityIDSafeVersion(results[0]) || null;
    this.levels = this.levels - ancestryNodes.size;
    // the results come back in ascending order on timestamp so the first entry in the
    // results should be the further ancestor (most distant grandparent)
    this.ancestorsToFind = ancestry(results[0]).slice(0, this.levels);
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
