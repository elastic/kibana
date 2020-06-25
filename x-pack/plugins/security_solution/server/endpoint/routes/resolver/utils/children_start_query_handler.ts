/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { ChildrenQuery } from '../queries/children';
import { TotalsPaginationBuilder } from './totals_pagination';
import { QueryInfo } from '../queries/multi_searcher';
import { QueryHandler } from './fetch';
import { ChildrenNodesHelper } from './children_helper';

export class ChildrenStartQueryHandler implements QueryHandler<ChildrenNodesHelper> {
  private readonly childrenHelper: ChildrenNodesHelper;
  private limitLeft: number;
  private query: ChildrenQuery;
  private nodeToQuery: string[] | undefined;

  constructor(
    private readonly limit: number,
    entityID: string,
    after: string | undefined,
    private readonly indexPattern: string,
    private readonly legacyEndpointID: string | undefined
  ) {
    this.query = new ChildrenQuery(
      TotalsPaginationBuilder.createBuilder(limit, after),
      indexPattern,
      legacyEndpointID
    );
    this.childrenHelper = new ChildrenNodesHelper(entityID);
    this.limitLeft = this.limit;
    this.nodeToQuery = [entityID];
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

    console.log('results: ', JSON.stringify(results, null, 2));

    this.childrenHelper.addPagination(totals, results);
    this.limitLeft = this.limit - this.childrenHelper.getNumNodes();

    // need to rethink this
    this.nodeToQuery = Array.from(this.childrenHelper.getIncompleteNodes().values());
    console.log('node to query ', this.nodeToQuery);
    console.log('limit left ', this.limitLeft);
    console.log('results ', results.length);
    this.query = new ChildrenQuery(
      // TODO create new method that takes the raw cursor information to ensure that we don't refind the last set of results
      // just pass in the result set and have it pull the information for the last event because it should be sorting by timestamp asc
      TotalsPaginationBuilder.createBuilder(this.limitLeft),
      this.indexPattern,
      this.legacyEndpointID
    );
  };

  hasMore(): boolean {
    return this.limitLeft > 0 && this.nodeToQuery !== undefined && this.nodeToQuery.length > 0;
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
