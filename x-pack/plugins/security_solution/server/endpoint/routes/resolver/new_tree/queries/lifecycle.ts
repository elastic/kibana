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

interface LifecycleParams {
  schema: Schema;
  indexPatterns: string | string[];
  timerange: Timerange;
}

/**
 * Builds a query for retrieving descendants of a node.
 */
export class LifecycleQuery {
  private readonly schema: Schema;
  private readonly indexPatterns: string | string[];
  private readonly timerange: Timerange;
  private readonly sourceFields: string[];
  constructor({ schema, indexPatterns, timerange }: LifecycleParams) {
    this.sourceFields = sourceFilter(schema);
    this.schema = schema;
    this.indexPatterns = indexPatterns;
    this.timerange = timerange;
  }

  private query(nodes: NodeID[]): JsonObject {
    return {
      // TODO look into switching this to doc_values
      _source: this.sourceFields,
      size: nodes.length,
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
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              terms: { [this.schema.id]: nodes },
            },
            {
              exists: {
                field: this.schema.id,
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

  async search(client: IScopedClusterClient, nodes: NodeID[]): Promise<unknown[]> {
    if (nodes.length <= 0) {
      return [];
    }

    const response: ApiResponse<SearchResponse<unknown>> = await client.asCurrentUser.search({
      body: this.query(nodes),
      index: this.indexPatterns,
    });

    return response.body.hits.hits.map((hit) => hit._source);
  }
}
