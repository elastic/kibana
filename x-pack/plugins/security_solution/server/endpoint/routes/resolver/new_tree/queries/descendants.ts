/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ApiResponse } from '@elastic/elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { JsonObject } from '../../../../../../../../../src/plugins/kibana_utils/common';
import { Nodes, sourceFilter, getNodesFromAggs, Schema } from './aggregation_utils';

interface Timerange {
  from: string;
  to: string;
}

interface DescendantsParams {
  schema: Schema;
  indexPatterns: string | string[];
  timerange: Timerange;
}

/**
 * Builds a query for retrieving descendants of a node.
 */
export class DescendantsQuery {
  private readonly schema: Schema;
  private readonly indexPatterns: string | string[];
  private readonly timerange: Timerange;
  private readonly sourceFields: string[];
  constructor({ schema, indexPatterns, timerange }: DescendantsParams) {
    this.sourceFields = sourceFilter(schema);
    this.schema = schema;
    this.indexPatterns = indexPatterns;
    this.timerange = timerange;
  }

  private query(nodes: Nodes, size: number): JsonObject {
    return {
      // TODO look into switching this to doc_values
      _source: this.sourceFields,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: this.timerange.from,
                  lte: this.timerange.to,
                  // TODO this is what the search_strategy uses, need to double check
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              terms: { [this.schema.parent]: nodes },
            },
            {
              exists: {
                field: this.schema.id,
              },
            },
            {
              exists: {
                field: this.schema.parent,
              },
            },
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
        [this.schema.id]: {
          terms: {
            field: this.schema.id,
            size,
            order: {
              timestampMin: 'asc',
            },
          },
          aggs: {
            singleEvent: {
              top_hits: {
                // TODO figure out if we can use doc_values
                _source: this.sourceFields,
                size: 1,
                // TODO there might a use case to make the order configurable
                sort: [{ '@timestamp': { order: 'asc' } }],
              },
            },
            timestampMin: {
              min: {
                field: '@timestamp',
              },
            },
          },
        },
      },
    };
  }

  private queryWithAncestryArray(nodes: Nodes, ancestryField: string, size: number): JsonObject {
    return {
      // TODO look into switching this to doc_values
      _source: this.sourceFields,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: this.timerange.from,
                  lte: this.timerange.to,
                  // TODO this is what the search_strategy uses, need to double check
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              terms: {
                [ancestryField]: nodes,
              },
            },
            {
              exists: {
                field: this.schema.id,
              },
            },
            {
              exists: {
                field: this.schema.parent,
              },
            },
            {
              exists: {
                field: ancestryField,
              },
            },
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
        [this.schema.id]: {
          terms: {
            field: this.schema.id,
            size,
          },
          aggs: {
            singleEvent: {
              top_hits: {
                // TODO figure out if we can use doc_values
                _source: this.sourceFields,
                size: 1,
                // TODO there might a use case to make the order configurable
                sort: [{ '@timestamp': { order: 'asc' } }],
              },
            },
            bucket_sort_order: {
              bucket_sort: {
                // first sort the buckets by which documents are more direct descendants of the requested nodes
                // (a direct descendants are children, then grandchildren etc)
                // then sort those by which document was created first (timestamp ascending)
                sort: [{ ancestry: 'asc' }, { timestampMin: 'asc' }],
              },
            },
            timestampMin: {
              min: {
                field: '@timestamp',
              },
            },
            ancestry: {
              max: {
                script: {
                  // This will return the location of the id in the ancestry array field. This
                  // will allow us to sort by levels of the tree.
                  source: `
                    Map ancestryToIndex = [:];
                    List sourceAncestryArray = params._source.process.Ext.ancestry;
                    int length = sourceAncestryArray.length;
                    for (int i = 0; i < length; i++) {
                      ancestryToIndex[sourceAncestryArray[i]] = i;
                    }
                    for (String id : params.ids) {
                      def index = ancestryToIndex[id];
                      if (index != null) {
                        return index;
                      }
                    }
                    return -1;
                  `,
                  params: {
                    ids: nodes,
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  /**
   * TODO get rid of the unknowns
   */
  async search(client: IScopedClusterClient, nodes: Nodes, limit: number): Promise<unknown> {
    let response: ApiResponse<SearchResponse<unknown>>;
    if (this.schema.ancestry) {
      response = await client.asCurrentUser.search({
        body: this.queryWithAncestryArray(nodes, this.schema.ancestry, limit),
        index: this.indexPatterns,
      });
    } else {
      response = await client.asCurrentUser.search({
        body: this.query(nodes, limit),
        index: this.indexPatterns,
      });
    }

    console.log('response ', JSON.stringify(response, null, 2));
    return getNodesFromAggs(this.schema.id, response.body.aggregations);
  }
}
