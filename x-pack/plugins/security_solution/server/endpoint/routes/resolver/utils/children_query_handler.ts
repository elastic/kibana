/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { ChildrenAncestryQuery } from '../queries/children_ancestry';
import { PaginationBuilder } from './pagination';
import { QueryInfo } from '../queries/multi_searcher';
import { SingleQueryHandler } from './fetch';

export class ChildrenQueryHandler implements SingleQueryHandler<ResolverEvent[]> {
  private children: ResolverEvent[] = [];
  private readonly query: ChildrenAncestryQuery;
  constructor(
    limit: number,
    private readonly entityID: string,
    after: string | undefined,
    indexPattern: string,
    legacyEndpointID: string | undefined
  ) {
    this.query = new ChildrenAncestryQuery(
      PaginationBuilder.createBuilder(limit, after),
      indexPattern,
      legacyEndpointID
    );
  }

  handleResponse = (response: SearchResponse<ResolverEvent>) => {
    this.children = this.query.formatResponse(response);
  };

  buildQuery(): QueryInfo {
    return {
      query: this.query,
      ids: this.entityID,
      handler: this.handleResponse,
    };
  }

  getResults() {
    return this.children;
  }

  async search(client: IScopedClusterClient) {
    this.handleResponse(await this.query.search(client, this.entityID));
    return this.getResults() || { results: [], totals: {} };
  }
}
