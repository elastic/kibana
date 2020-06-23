/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { ResolverRelatedAlerts, ResolverEvent } from '../../../../../common/endpoint/types';
import { createRelatedAlerts } from './node';
import { AlertsQuery } from '../queries/alerts';
import { PaginationBuilder } from './pagination';
import { QueryInfo } from '../queries/multi_searcher';
import { SingleQueryHandler } from './fetch';

export class RelatedAlertsQueryHandler implements SingleQueryHandler<ResolverRelatedAlerts> {
  private relatedEvents: ResolverRelatedAlerts | undefined;
  private readonly query: AlertsQuery;
  constructor(
    private readonly limit: number,
    private readonly entityID: string,
    after: string | undefined,
    indexPattern: string,
    legacyEndpointID: string | undefined
  ) {
    this.query = new AlertsQuery(
      PaginationBuilder.createBuilder(limit, after),
      indexPattern,
      legacyEndpointID
    );
  }

  handleResponse = (response: SearchResponse<ResolverEvent>) => {
    const results = this.query.formatResponse(response);
    this.relatedEvents = createRelatedAlerts(
      this.entityID,
      results,
      PaginationBuilder.buildCursorRequestLimit(this.limit, results)
    );
  };

  buildQuery(): QueryInfo {
    return {
      query: this.query,
      ids: this.entityID,
      handler: this.handleResponse,
    };
  }

  getResults() {
    return this.relatedEvents;
  }

  async search(client: IScopedClusterClient) {
    this.handleResponse(await this.query.search(client, this.entityID));
    return this.getResults() || createRelatedAlerts(this.entityID);
  }
}
