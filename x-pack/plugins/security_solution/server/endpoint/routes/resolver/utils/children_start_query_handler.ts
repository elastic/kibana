/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { ChildrenAncestryQuery } from '../queries/children_ancestry';
import { TotalsPaginationBuilder } from './totals_pagination';
import { QueryInfo } from '../queries/multi_searcher';
import { QueryHandler } from './fetch';
import { ChildrenNodesHelper } from './children_helper';

export class ChildrenStartQueryHandler implements QueryHandler<ChildrenNodesHelper> {
  private readonly childrenHelper: ChildrenNodesHelper;
  private limitLeft: number;
  private query: ChildrenAncestryQuery;
  private nodeToQuery: string | undefined;

  constructor(
    private readonly limit: number,
    entityID: string,
    after: string | undefined,
    private readonly indexPattern: string,
    private readonly legacyEndpointID: string | undefined
  ) {
    this.query = new ChildrenAncestryQuery(
      TotalsPaginationBuilder.createBuilder(limit, after),
      indexPattern,
      legacyEndpointID
    );
    this.childrenHelper = new ChildrenNodesHelper(entityID);
    this.limitLeft = this.limit;
    this.nodeToQuery = entityID;
  }

  private setNoMore() {
    this.nodeToQuery = undefined;
    this.limitLeft = 0;
  }

  handleResponse = (response: SearchResponse<ResolverEvent>) => {
    const { totals, results } = this.query.formatResponse(response);
    if (results.length === 0) {
      // this would happen if an invalid entity ID is passed in
      // in that case just return nothing
      this.setNoMore();
      return;
    }

    this.childrenHelper.addPagination(totals, results);
    this.limitLeft = this.limit - this.childrenHelper.getNumNodes();
    this.nodeToQuery = this.childrenHelper.getIncompleteNodes().values().next().value;

    this.query = new ChildrenAncestryQuery(
      TotalsPaginationBuilder.createBuilder(this.limitLeft),
      this.indexPattern,
      this.legacyEndpointID
    );
  };

  hasMore(): boolean {
    return this.limit > 0 && this.nodeToQuery !== undefined;
  }

  nextQuery(): QueryInfo | undefined {
    if (this.hasMore()) {
      return {
        query: this.query,
        // This should never be undefined because the check above
        ids: this.nodeToQuery || '',
        handler: this.handleResponse,
      };
    }
  }

  getResults(): ChildrenNodesHelper {
    return this.childrenHelper;
  }

  async search(client: IScopedClusterClient) {
    if (this.hasMore()) {
      this.handleResponse(await this.query.search(client, this.nodeToQuery || ''));
    }
    return this.getResults();
  }
}
