/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { ResolverEvent, ResolverChildren } from '../../../../../common/endpoint/types';
import { LifecycleQuery } from '../queries/lifecycle';
import { QueryInfo } from '../queries/multi_searcher';
import { SingleQueryHandler } from './fetch';
import { ChildrenNodesHelper } from './children_helper';
import { createChildren } from './node';

// TODO change the name to reflect children nodes
export class LifecycleQueryHandler implements SingleQueryHandler<ResolverChildren> {
  private lifecycle: ResolverChildren | undefined;
  private readonly query: LifecycleQuery;
  constructor(
    private readonly childrenHelper: ChildrenNodesHelper,
    indexPattern: string,
    legacyEndpointID: string | undefined
  ) {
    this.query = new LifecycleQuery(indexPattern, legacyEndpointID);
  }

  handleResponse = (response: SearchResponse<ResolverEvent>) => {
    this.childrenHelper.addLifecycleEvents(this.query.formatResponse(response));
    this.lifecycle = this.childrenHelper.getNodes();
  };

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

  getResults(): ResolverChildren | undefined {
    return this.lifecycle;
  }

  async search(client: IScopedClusterClient) {
    const results = this.getResults();
    if (results) {
      return results;
    }

    this.handleResponse(await this.query.search(client, this.childrenHelper.getEntityIDs()));
    return this.getResults() || createChildren();
  }
}
