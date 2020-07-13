/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { ResolverEvent, ResolverChildren } from '../../../../../common/endpoint/types';
import { LifecycleQuery } from '../queries/lifecycle';
import { QueryInfo } from '../queries/multi_searcher';
import { SingleQueryHandler } from './fetch';
import { ChildrenNodesHelper } from './children_helper';
import { createChildren } from './node';

/**
 * Returns the children of a resolver tree.
 */
export class ChildrenLifecycleQueryHandler implements SingleQueryHandler<ResolverChildren> {
  private lifecycle: ResolverChildren | undefined;
  private readonly query: LifecycleQuery;
  constructor(
    private readonly childrenHelper: ChildrenNodesHelper,
    indexPattern: string,
    legacyEndpointID: string | undefined
  ) {
    this.query = new LifecycleQuery(indexPattern, legacyEndpointID);
  }

  private handleResponse = (response: SearchResponse<ResolverEvent>) => {
    this.childrenHelper.addLifecycleEvents(this.query.formatResponse(response));
    this.lifecycle = this.childrenHelper.getNodes();
  };

  /**
   * Get the query for msearch. Once the results are set this will return undefined.
   */
  nextQuery(): QueryInfo | undefined {
    if (this.getResults()) {
      return;
    }

    return {
      query: this.query,
      ids: this.childrenHelper.getEntityIDs(),
      handler: this.handleResponse,
    };
  }

  /**
   * Return the results from the search.
   */
  getResults(): ResolverChildren | undefined {
    return this.lifecycle;
  }

  /**
   * Perform a regular search and return the results.
   *
   * @param client the elasticsearch client
   */
  async search(client: ILegacyScopedClusterClient) {
    const results = this.getResults();
    if (results) {
      return results;
    }

    this.handleResponse(await this.query.search(client, this.childrenHelper.getEntityIDs()));
    return this.getResults() || createChildren();
  }
}
