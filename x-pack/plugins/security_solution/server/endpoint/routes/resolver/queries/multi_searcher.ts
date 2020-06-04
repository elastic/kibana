/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { MSearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/public';

/**
 * Contract for queries to be compatible with ES multi search api
 */
export interface MSearchQuery {
  /**
   * Builds an array of header and body pairs for use in a multi search
   *
   * @param ids one or many unique identifiers for nodes.
   * @returns an array of header and body pairs describing multi search queries
   */
  buildMSearch(ids: string | string[]): JsonObject[];
}

/**
 * Contract for adding a query for multi search
 */
export interface QueryInfo {
  /**
   * A multi search query
   */
  query: MSearchQuery;
  /**
   * one or many unique identifiers to be searched for in this query
   */
  ids: string | string[];
}

/**
 * Executes a multi search within ES.
 *
 * More info on multi search here:
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-multi-search.html
 * https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/msearch_examples.html
 */
export class MultiSearcher {
  constructor(private readonly client: IScopedClusterClient) {}

  /**
   * Perform the multi search on the passed in queries
   *
   * @param queries multi search queries
   * @returns an array of SearchResponse<ResolverEvent>
   */
  async search(queries: QueryInfo[]) {
    if (queries.length === 0) {
      throw new Error('No queries provided to MultiSearcher');
    }

    let searchQuery: JsonObject[] = [];
    queries.forEach(
      (info) => (searchQuery = [...searchQuery, ...info.query.buildMSearch(info.ids)])
    );
    const res: MSearchResponse<ResolverEvent> = await this.client.callAsCurrentUser('msearch', {
      body: searchQuery,
    });

    if (!res.responses) {
      throw new Error('No response from Elasticsearch');
    }

    if (res.responses.length !== queries.length) {
      throw new Error(`Responses length was: ${res.responses.length} expected ${queries.length}`);
    }
    return res.responses;
  }
}
