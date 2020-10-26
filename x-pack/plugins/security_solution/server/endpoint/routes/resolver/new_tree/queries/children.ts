/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ApiResponse } from '@elastic/elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { JsonObject } from '../../../../../../../../../src/plugins/kibana_utils/common';
import { UniqueID } from './unique_id';

interface Timerange {
  start: string;
  end: string;
}

type Nodes = Array<Map<string, string>>;

/**
 * Builds a query for retrieving descendants of a node.
 * The first type `ChildEvent[]` represents the final formatted result. The second type `ChildEvent` defines the type
 * used in the `SearchResponse<T>` field returned from the ES query.
 */
export class DescendantsQuery {
  constructor(
    // TODO make these params an object maybe?
    private readonly uniqueID: UniqueID,
    private readonly indexPattern: string | string[],
    private readonly timerange: Timerange,
    private readonly size: number
  ) {}

  private query(nodes: Nodes): JsonObject {
    return {
      // TODO look into switching this to doc_values
      _source: ['@timestamp', ...this.uniqueID.sourceFilter],
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
            this.uniqueID.buildDescendantsQueryFilters(nodes),
            ...this.uniqueID.buildEmptyRestraints(),
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

  /**
   * TODO get rid of the unknowns
   */
  async search(client: IScopedClusterClient, nodes: Nodes): Promise<unknown> {
    const response: ApiResponse<SearchResponse<unknown>> = await client.asCurrentUser.search({
      body: this.query(nodes),
      index: this.indexPattern,
    });
    return this.uniqueID.getNodesFromAggs(response);
  }
}
