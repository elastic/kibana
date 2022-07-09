/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { JsonObject, JsonValue } from '@kbn/utility-types';
import type { FieldsObject, ResolverSchema } from '../../../../../../common/endpoint/types';
import type { NodeID, TimeRange } from '../utils';
import { docValueFields, validIDs } from '../utils';

interface LifecycleParams {
  schema: ResolverSchema;
  indexPatterns: string | string[];
  timeRange: TimeRange;
  isInternalRequest: boolean;
}

/**
 * Builds a query for retrieving descendants of a node.
 */
export class LifecycleQuery {
  private readonly schema: ResolverSchema;
  private readonly indexPatterns: string | string[];
  private readonly timeRange: TimeRange;
  private readonly docValueFields: JsonValue[];
  private readonly isInternalRequest: boolean;
  constructor({ schema, indexPatterns, timeRange, isInternalRequest }: LifecycleParams) {
    this.docValueFields = docValueFields(schema);
    this.schema = schema;
    this.indexPatterns = indexPatterns;
    this.timeRange = timeRange;
    this.isInternalRequest = isInternalRequest;
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
              bool: {
                must_not: {
                  term: { [this.schema.id]: '' },
                },
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
    const validNodes = validIDs(nodes);
    if (validNodes.length <= 0) {
      return [];
    }

    const esClient = this.isInternalRequest ? client.asInternalUser : client.asCurrentUser;

    const body = await esClient.search({
      body: this.query(validNodes),
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
    // @ts-expect-error @elastic/elasticsearch _source is optional
    return body.hits.hits.map((hit) => hit.fields);
  }
}
