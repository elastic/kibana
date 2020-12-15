/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ApiResponse } from '@elastic/elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { FieldsObject, ResolverSchema } from '../../../../../../common/endpoint/types';
import { JsonObject, JsonValue } from '../../../../../../../../../src/plugins/kibana_utils/common';
import { NodeID, TimeRange, docValueFields } from '../utils/index';

interface LifecycleParams {
  schema: ResolverSchema;
  indexPatterns: string | string[];
  timeRange: TimeRange;
}

/**
 * Builds a query for retrieving descendants of a node.
 */
export class LifecycleQuery {
  private readonly schema: ResolverSchema;
  private readonly indexPatterns: string | string[];
  private readonly timeRange: TimeRange;
  private readonly docValueFields: JsonValue[];
  constructor({ schema, indexPatterns, timeRange }: LifecycleParams) {
    this.docValueFields = docValueFields(schema);
    this.schema = schema;
    this.indexPatterns = indexPatterns;
    this.timeRange = timeRange;
  }

  private query(nodes: NodeID[]): JsonObject {
    return {
      _source: false,
      docvalue_fields: this.docValueFields,
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
                  gte: this.timeRange.from,
                  lte: this.timeRange.to,
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

  /**
   * Searches for lifecycle events matching the specified node IDs.
   *
   * @param client for making requests to Elasticsearch
   * @param nodes the unique IDs to search for in Elasticsearch
   */
  async search(client: IScopedClusterClient, nodes: NodeID[]): Promise<FieldsObject[]> {
    if (nodes.length <= 0) {
      return [];
    }

    const response: ApiResponse<SearchResponse<unknown>> = await client.asCurrentUser.search({
      body: this.query(nodes),
      index: this.indexPatterns,
    });

    /**
     * The returned values will look like:
     * [
     *  { 'schema_id_value': <value>, 'schema_parent_value': <value> }
     * ]
     *
     * So the schema fields are flattened ('process.parent.entity_id')
     */
    return response.body.hits.hits.map((hit) => hit.fields);
  }
}
