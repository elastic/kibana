/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { ResolverEvent, LifecycleNode } from '../../../../../common/endpoint/types';
import { LifecycleQuery } from '../queries/lifecycle';
import { QueryInfo } from '../queries/multi_searcher';
import { SingleQueryHandler } from './fetch';
import { createLifecycle } from './node';

/**
 * Retrieve the lifecycle events for a node.
 */
export class LifecycleQueryHandler implements SingleQueryHandler<LifecycleNode> {
  private lifecycle: LifecycleNode | undefined;
  private readonly query: LifecycleQuery;
  constructor(
    private readonly entityID: string,
    indexPattern: string,
    legacyEndpointID: string | undefined
  ) {
    this.query = new LifecycleQuery(indexPattern, legacyEndpointID);
  }

  private handleResponse = (response: SearchResponse<ResolverEvent>) => {
    const results = this.query.formatResponse(response);
    if (results.length !== 0) {
      this.lifecycle = createLifecycle(this.entityID, results);
    }
  };

  /**
   * Build the query for retrieving the lifecycle events. This will return undefined once the results have been found.
   */
  nextQuery(): QueryInfo | undefined {
    if (this.getResults()) {
      return;
    }

    return {
      query: this.query,
      ids: this.entityID,
      handler: this.handleResponse,
    };
  }

  /**
   * Get the results from the msearch.
   */
  getResults(): LifecycleNode | undefined {
    return this.lifecycle;
  }

  /**
   * Do a regular search and return the results.
   *
   * @param client the elasticsearch client.
   */
  async search(client: IScopedClusterClient) {
    const results = this.getResults();
    if (results) {
      return results;
    }

    this.handleResponse(await this.query.search(client, this.entityID));
    return this.getResults() ?? createLifecycle(this.entityID, []);
  }
}
