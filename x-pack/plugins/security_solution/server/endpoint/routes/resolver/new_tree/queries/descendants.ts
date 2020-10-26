/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ApiResponse } from '@elastic/elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { JsonObject, JsonValue } from '../../../../../../../../../src/plugins/kibana_utils/common';
import { UniqueID } from './unique_id';

interface Timerange {
  start: string;
  end: string;
}

type Nodes = Array<Map<string, string>>;

interface DescendantsParams {
  uniqueID: UniqueID;
  indexPatterns: string | string[];
  timerange: Timerange;
  size: number;
}

/**
 * Builds a query for retrieving descendants of a node.
 */
export class DescendantsQuery {
  private readonly uniqueID: UniqueID;
  private readonly indexPatterns: string | string[];
  private readonly timerange: Timerange;
  private readonly size: number;
  constructor({ uniqueID, indexPatterns, timerange, size }: DescendantsParams) {
    this.uniqueID = uniqueID;
    this.indexPatterns = indexPatterns;
    this.timerange = timerange;
    this.size = size;
  }

  private query(shouldClauses: JsonValue[]): JsonObject {
    return {
      // TODO look into switching this to doc_values
      _source: this.uniqueID.sourceFilter,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: this.timerange.start,
                  lte: this.timerange.end,
                  // TODO this is what the search_strategy uses, need to double check
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                should: shouldClauses,
              },
            },
            ...this.uniqueID.buildConstraints(),
            {
              term: { 'event.category': 'process' },
            },
            {
              term: { 'event.kind': 'event' },
            },
          ],
        },
      },
      aggs: this.uniqueID.buildAggregations(this.size),
    };
  }

  private queryWithAncestryArray(nodes: Nodes): JsonObject {
    return {
      // TODO look into switching this to doc_values
      _source: this.uniqueID.sourceFilter,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: this.timerange.start,
                  lte: this.timerange.end,
                  // TODO this is what the search_strategy uses, need to double check
                  format: 'strict_date_optional_time',
                },
              },
            },
            ...this.uniqueID.buildDescendantsAncestryQueryFilters(nodes),
            ...this.uniqueID.buildConstraints(),
            {
              term: { 'event.category': 'process' },
            },
            {
              term: { 'event.kind': 'event' },
            },
          ],
        },
      },
      aggs: this.uniqueID.buildAncestryAggregations(this.size),
    };
  }

  private async searchChunked(client: IScopedClusterClient, nodes: Nodes): Promise<unknown> {
    const filters = this.uniqueID.buildDescendantsQueryFilters(nodes);
    const searches = [];
    // this is the max number of bool clauses an elasticsearch query can contain is 1024 so let's
    // make sure we're less than that
    const chunkSize = 1000;
    for (let i = 0; i < filters.length; i += chunkSize) {
      const chunkedFilters = filters.slice(i, i + chunkSize);
      searches.push(
        client.asCurrentUser.search<SearchResponse<unknown>>({
          body: this.query(chunkedFilters),
          index: this.indexPatterns,
        })
      );
    }
    const results: Array<ApiResponse<SearchResponse<unknown>>> = await Promise.all(searches);
    return results.reduce((allResults: unknown[], resultChunk) => {
      allResults.push(...this.uniqueID.getNodesFromAggs(resultChunk));
      return allResults;
    }, []);
  }

  private async searchWithAncestryArray(
    client: IScopedClusterClient,
    nodes: Nodes
  ): Promise<unknown> {}

  /**
   * TODO get rid of the unknowns
   */
  async search(client: IScopedClusterClient, nodes: Nodes): Promise<unknown> {
    if (this.uniqueID.idSchema.ancestry) {
      return this.searchWithAncestryArray(client, nodes);
    }
    return this.searchChunked(client, nodes);
  }
}
