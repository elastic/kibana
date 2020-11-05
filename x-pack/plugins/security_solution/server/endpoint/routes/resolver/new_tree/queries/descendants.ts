/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ApiResponse } from '@elastic/elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { JsonObject } from '../../../../../../../../../src/plugins/kibana_utils/common';
import { NodeID, sourceFilter, Schema, Timerange } from '../utils/index';

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

  private query(nodes: NodeID[], size: number): JsonObject {
    return {
      // TODO look into switching this to doc_values
      _source: this.sourceFields,
      size,
      collapse: {
        field: this.schema.id,
      },
      sort: [{ '@timestamp': 'asc' }],
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
    };
  }

  private queryWithAncestryArray(nodes: NodeID[], ancestryField: string, size: number): JsonObject {
    return {
      // TODO look into switching this to doc_values
      _source: this.sourceFields,
      size,
      collapse: {
        field: this.schema.id,
      },
      sort: [
        {
          _script: {
            type: 'number',
            script: {
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
        { '@timestamp': 'asc' },
      ],
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: this.timerange.from,
                  lte: this.timerange.to,
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
    };
  }

  async search(client: IScopedClusterClient, nodes: NodeID[], limit: number): Promise<unknown[]> {
    if (nodes.length <= 0) {
      return [];
    }

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

    return response.body.hits.hits.map((hit) => hit._source);
  }
}
