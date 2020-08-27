/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { ResolverRelatedAlerts, ResolverEvent } from '../../../../../common/endpoint/types';
import { createRelatedAlerts } from './node';
import { AlertsQuery } from '../queries/alerts';
import { PaginationBuilder } from './pagination';
import { QueryInfo } from '../queries/multi_searcher';
import { SingleQueryHandler } from './fetch';

/**
 * Parameters for RelatedAlertsQueryHandler
 */
export interface RelatedAlertsParams {
  limit: number;
  entityID: string;
  indexPattern: string;
  after?: string;
  legacyEndpointID?: string;
  filter?: string;
}

/**
 * Requests related alerts for the given node.
 */
export class RelatedAlertsQueryHandler implements SingleQueryHandler<ResolverRelatedAlerts> {
  private relatedAlerts: ResolverRelatedAlerts | undefined;
  private readonly query: AlertsQuery;
  private readonly limit: number;
  private readonly entityID: string;

  constructor(options: RelatedAlertsParams) {
    this.limit = options.limit;
    this.entityID = options.entityID;
    this.query = new AlertsQuery(
      PaginationBuilder.createBuilder(this.limit, options.after),
      options.indexPattern,
      options.legacyEndpointID,
      options.filter
    );
  }

  private handleResponse = (response: SearchResponse<ResolverEvent>) => {
    const results = this.query.formatResponse(response);
    this.relatedAlerts = createRelatedAlerts(
      this.entityID,
      results,
      PaginationBuilder.buildCursorRequestLimit(this.limit, results)
    );
  };

  /**
   * Builds a QueryInfo object that defines the related alerts to search for and how to handle the response.
   *
   * This will return undefined onces the results have been retrieved from ES.
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
    return this.relatedAlerts;
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

    this.handleResponse(await this.query.search(client, this.entityID));
    return this.getResults() ?? createRelatedAlerts(this.entityID);
  }
}
