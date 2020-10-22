/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ECSField } from '../../../../../../common/endpoint/types';
import { JsonObject } from '../../../../../../../../../src/plugins/kibana_utils/common';
import { UniqueID } from './unique_id';

/**
 * This type represents the document returned from ES for a legacy event when using the ChildrenQuery to fetch legacy events.
 * It contains only the necessary fields that the children api needs to process the results before
 * it requests the full lifecycle information for the children in a later query.
 */
export type LegacyChildEvent = Partial<{
  '@timestamp': ECSField<number>;
  event: Partial<{
    type: ECSField<string>;
    action: ECSField<string>;
  }>;
  endgame: Partial<{
    serial_event_id: ECSField<number>;
    unique_pid: ECSField<number>;
    unique_ppid: ECSField<number>;
  }>;
}>;

/**
 * This type represents the document returned from ES for an event when using the ChildrenQuery to fetch legacy events.
 * It contains only the necessary fields that the children api needs to process the results before
 * it requests the full lifecycle information for the children in a later query.
 */
export type EndpointChildEvent = Partial<{
  '@timestamp': ECSField<number>;
  event: Partial<{
    type: ECSField<string>;
    sequence: ECSField<number>;
  }>;
  process: Partial<{
    entity_id: ECSField<string>;
    parent: Partial<{
      entity_id: ECSField<string>;
    }>;
    Ext: Partial<{
      ancestry: ECSField<string>;
    }>;
  }>;
}>;

export type ChildEvent = EndpointChildEvent | LegacyChildEvent;

interface Timerange {
  start: string;
  end: string;
}

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

  private query(nodes: Array<Map<string, string>>): JsonObject {
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
            this.uniqueID.buildQueryFilters(nodes),
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
      aggs: {
        by_id: {
          terms: {
            field:
          }
        }
      },
    };
  }

  formatResponse(response: SearchResponse<ChildEvent>): ChildEvent[] {
    return response.hits.hits.map((hit) => hit._source);
  }
}

/**
 * "aggs": {
    "by_entity_id": {
      "terms": {
        "field": "process.entity_id",
        "size": 100,
        "order": {
          "ancestry": "asc"
        }
      },
      "aggs": {
        "top_children": {
          "top_hits": {
            "_source": ["process.Ext.ancestry", "process.entity_id", "process.parent.entity_id"],
            "size": 100,
            "sort": [
              {
                "@timestamp": {
                  "order": "asc"
                }
              }
            ]
          }
        },
 *
 */
