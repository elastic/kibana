/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { ChildrenQuery } from '../queries/children';
import { QueryInfo } from '../queries/multi_searcher';
import { QueryHandler } from './fetch';
import { ChildrenNodesHelper } from './children_helper';
import { PaginationBuilder } from './pagination';

/**
 * Retrieve the start lifecycle events for the children of a resolver tree.
 *
 * If using msearch you should loop over hasMore() because the results are limited to the size of the ancestry array.
 */
export class ChildrenStartQueryHandler implements QueryHandler<ChildrenNodesHelper> {
  private readonly childrenHelper: ChildrenNodesHelper;
  private limitLeft: number;
  private query: ChildrenQuery;
  private nodesToQuery: Set<string>;

  constructor(
    private readonly limit: number,
    entityID: string,
    after: string | undefined,
    private readonly indexPattern: string,
    private readonly legacyEndpointID: string | undefined
  ) {
    this.query = new ChildrenQuery(
      PaginationBuilder.createBuilder(limit, after),
      indexPattern,
      legacyEndpointID
    );
    this.childrenHelper = new ChildrenNodesHelper(entityID, this.limit);
    this.limitLeft = this.limit;
    this.nodesToQuery = new Set([entityID]);
  }

  private setNoMore() {
    this.nodesToQuery = new Set();
    this.limitLeft = 0;
  }

  private handleResponse = (response: SearchResponse<ResolverEvent>) => {
    const results = this.query.formatResponse(response);
    this.nodesToQuery = this.childrenHelper.addStartEvents(this.nodesToQuery, results) ?? new Set();

    if (results.length === 0) {
      this.setNoMore();
      return;
    }

    this.limitLeft = this.limit - this.childrenHelper.getNumNodes();
    this.query = new ChildrenQuery(
      PaginationBuilder.createBuilder(this.limitLeft),
      this.indexPattern,
      this.legacyEndpointID
    );
  };

  /**
   * Check if there are more results to retrieve based on the limit that was passed in.
   */
  hasMore(): boolean {
    return this.limitLeft > 0 && this.nodesToQuery.size > 0;
  }

  /**
   * Get a query to retrieve the next set of results.
   */
  nextQuery(): QueryInfo | undefined {
    if (this.hasMore()) {
      return {
        query: this.query,
        // This should never be undefined because the check above
        ids: Array.from(this.nodesToQuery.values()),
        handler: this.handleResponse,
      };
    }
  }

  /**
   * Get the cached results from the ES responses.
   */
  getResults(): ChildrenNodesHelper {
    return this.childrenHelper;
  }

  /**
   * Perform a regular search and return the helper.
   *
   * @param client the elasticsearch client
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
