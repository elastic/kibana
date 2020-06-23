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
import { LifecycleQuery } from '../queries/lifecycle';
import { QueryInfo } from '../queries/multi_searcher';
import { SingleQueryHandler } from './fetch';
import { createLifecycle } from './node';

// TODO change the name to reflect children nodes
export class LifecycleQueryHandler implements SingleQueryHandler<ResolverChildren> {
  // TODO change this to be ResolverChildren
  private lifecycle: ResolverEvent[] = [];
  private readonly query: LifecycleQuery;
  // TODO need to take in nextChild
  constructor(
    private readonly entityIDs: string[],
    indexPattern: string,
    legacyEndpointID: string | undefined
  ) {
    this.query = new LifecycleQuery(indexPattern, legacyEndpointID);
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

  handleResponse = (response: SearchResponse<ResolverEvent>) => {
    this.lifecycle = LifecycleQueryHandler.toMapOfNodes(
      this.query.formatResponse(response)
    ).values();
  };

  buildQuery(): QueryInfo {
    return {
      query: this.query,
      ids: this.entityIDs,
      handler: this.handleResponse,
    };
  }

  getResults() {
    return this.lifecycle;
  }

  async search(client: IScopedClusterClient) {
    this.handleResponse(await this.query.search(client, this.entityIDs));
    return this.getResults();
  }
}
