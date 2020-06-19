/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { ResolverRelatedEvents, ResolverEvent } from '../../../../../common/endpoint/types';
import { createRelatedEvents } from './node';
import { EventsQuery } from '../queries/events';
import { PaginationBuilder } from './pagination';
import { QueryInfo } from '../queries/multi_searcher';
import { QueryHandler } from './fetch';

export class RelatedEventsQueryHandler implements QueryHandler<ResolverRelatedEvents> {
  private relatedEvents: ResolverRelatedEvents | undefined;
  private readonly query: EventsQuery;
  constructor(
    private readonly limit: number,
    private readonly entityID: string,
    after: string | undefined,
    indexPattern: string,
    legacyEndpointID: string | undefined
  ) {
    this.query = new EventsQuery(
      PaginationBuilder.createBuilder(limit, after),
      indexPattern,
      legacyEndpointID
    );
  }

  handleResponse = (response: SearchResponse<ResolverEvent>) => {
    const results = this.query.formatResponse(response);
    this.relatedEvents = createRelatedEvents(
      this.entityID,
      results,
      PaginationBuilder.buildCursorRequestLimit(this.limit, results)
    );
  };

  buildQuery(): QueryInfo | undefined {
    if (this.relatedEvents) {
      return;
    }

    return {
      query: this.query,
      ids: this.entityID,
      handler: this.handleResponse,
    };
  }

  getResults() {
    return this.relatedEvents;
  }

  async doSearch(client: IScopedClusterClient) {
    this.handleResponse(await this.query.search(client, this.entityID));
    return this.getResults() || createRelatedEvents(this.entityID);
  }
}
