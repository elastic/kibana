/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';
import { legacyEventIndexPattern } from './legacy_event_index_pattern';
import { MSearchQuery } from './multi_searcher';

/**
 * ResolverQuery provides the base structure for queries to retrieve events when building a resolver graph.
 *
 * @param T the structured return type of a resolver query. This represents the final return type of the query after handling
 * any aggregations.
 * @param R the is the type after transforming ES's response. Making this definable let's us set whether it is a resolver event
 * or something else.
 */
export abstract class ResolverQuery<T, R = ResolverEvent> implements MSearchQuery {
  /**
   *
   * @param indexPattern the index pattern to use in the query for finding indices with documents in ES.
   * @param endpointID this field is optional because it is only used when searching for legacy event data. The reason
   *  we need `endpointID` for legacy data is because we don't have a cross endpoint unique identifier for process
   *  events. Instead we use `unique_pid/ppid` and `endpointID` to uniquely identify a process event.
   */
  constructor(
    private readonly indexPattern: string | string[],
    private readonly endpointID?: string
  ) {}

  private static createIdsArray(ids: string | string[]): string[] {
    return Array.isArray(ids) ? ids : [ids];
  }

  private buildQuery(ids: string | string[]): { query: JsonObject; index: string | string[] } {
    const idsArray = ResolverQuery.createIdsArray(ids);
    if (this.endpointID) {
      return { query: this.legacyQuery(this.endpointID, idsArray), index: legacyEventIndexPattern };
    }
    return { query: this.query(idsArray), index: this.indexPattern };
  }

  private buildSearch(ids: string | string[]) {
    const { query, index } = this.buildQuery(ids);
    return {
      body: query,
      index,
    };
  }

  protected getResults(response: SearchResponse<R>): R[] {
    return response.hits.hits.map((hit) => hit._source);
  }

  /**
   * Builds a multi search representation for this query
   *
   * @param ids a single or multiple unique id (e.g. entity_id for new events or unique_pid for legacy events) to search for in the query
   * @returns an array of header and body pairs that represents a multi search
   * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-multi-search.html
   * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/msearch_examples.html
   */
  buildMSearch(ids: string | string[]): JsonObject[] {
    const { query, index } = this.buildQuery(ids);
    return [{ index }, query];
  }

  /**
   * Searches ES for the specified ids and format the response.
   *
   * @param client a client for searching ES
   * @param ids a single more multiple unique node ids (e.g. entity_id or unique_pid)
   */
  async searchAndFormat(client: ILegacyScopedClusterClient, ids: string | string[]): Promise<T> {
    const res: SearchResponse<ResolverEvent> = await this.search(client, ids);
    return this.formatResponse(res);
  }

  /**
   * Searches ES for the specified ids but do not format the response.
   *
   * @param client a client for searching ES
   * @param ids a single more multiple unique node ids (e.g. entity_id or unique_pid)
   */
  async search(client: ILegacyScopedClusterClient, ids: string | string[]) {
    return client.callAsCurrentUser('search', this.buildSearch(ids));
  }

  /**
   * Builds a query to search the legacy data format.
   *
   * @param endpointID a unique identifier for a sensor
   * @param uniquePIDs array of unique process IDs to search for
   * @returns a query to use in ES
   */
  protected abstract legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject;

  /**
   * Builds a query to search for events in ES.
   *
   * @param entityIDs array of unique identifiers for events treated as nodes
   */
  protected abstract query(entityIDs: string[]): JsonObject;

  /**
   * Translates the response from executing the derived class's query into a structured object
   *
   * @param response a SearchResponse from ES resulting from executing this query
   * @returns the translated ES response into a structured object
   */
  public abstract formatResponse(response: SearchResponse<ResolverEvent>): T;
}
