/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { ResolverRelatedEvents, ResolverEvent } from '../../../../../common/endpoint/types';
import { createRelatedEvents } from './node';
import { EventsQuery } from '../queries/events';
import { PaginationBuilder } from './pagination';
import { QueryInfo } from '../queries/multi_searcher';
import { SingleQueryHandler } from './fetch';

/**
 * This retrieves the related events for the origin node of a resolver tree.
 */
export class RelatedEventsQueryHandler implements SingleQueryHandler<ResolverRelatedEvents> {
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

  private handleResponse = (response: SearchResponse<ResolverEvent>) => {
    const results = this.query.formatResponse(response);
    this.relatedEvents = createRelatedEvents(
      this.entityID,
      results,
      PaginationBuilder.buildCursorRequestLimit(this.limit, results)
    );
  };

  /**
   * Get a query to use in a msearch.
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
   * Get the results after an msearch.
   */
  getResults() {
    return this.relatedEvents;
  }

  /**
   * Perform a normal search and return the related events results.
   *
   * @param client the elasticsearch client
   */
  async search(client: ILegacyScopedClusterClient) {
    const results = this.getResults();
    if (results) {
      return results;
    }

    this.handleResponse(await this.query.search(client, this.entityID));
    return this.getResults() ?? createRelatedEvents(this.entityID);
  }
}
