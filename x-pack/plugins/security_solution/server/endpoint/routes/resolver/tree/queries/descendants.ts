/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core/server';
import { JsonObject, JsonValue } from '@kbn/utility-types';
import { FieldsObject, ResolverSchema } from '../../../../../../common/endpoint/types';
import { NodeID, TimeRange, docValueFields, validIDs } from '../utils';

interface DescendantsParams {
  schema: ResolverSchema;
  indexPatterns: string | string[];
  timeRange: TimeRange;
}

/**
 * Builds a query for retrieving descendants of a node.
 */
export class DescendantsQuery {
  private readonly schema: ResolverSchema;
  private readonly indexPatterns: string | string[];
  private readonly timeRange: TimeRange;
  private readonly docValueFields: JsonValue[];

  constructor({ schema, indexPatterns, timeRange }: DescendantsParams) {
    this.docValueFields = docValueFields(schema);
    this.schema = schema;
    this.indexPatterns = indexPatterns;
    this.timeRange = timeRange;
  }

  private query(nodes: NodeID[], size: number): JsonObject {
    return {
      _source: false,
      docvalue_fields: this.docValueFields,
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
                  gte: this.timeRange.from,
                  lte: this.timeRange.to,
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

  private queryWithAncestryArray(nodes: NodeID[], ancestryField: string, size: number): JsonObject {
    return {
      _source: false,
      docvalue_fields: this.docValueFields,
      size,
      collapse: {
        field: this.schema.id,
      },
      sort: [
        {
          _script: {
            type: 'number',
            script: {
              /**
               * This script is used to sort the returned documents in a breadth first order so that we return all of
               * a single level of nodes before returning the next level of nodes. This is needed because using the
               * ancestry array could result in the search going deep before going wide depending on when the nodes
               * spawned their children. If a node spawns a child before it's sibling is spawned then the child would
               * be found before the sibling because by default the sort was on timestamp ascending.
               */
              source: `
                Map ancestryToIndex = [:];
                List sourceAncestryArray = params._source.${ancestryField};
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
                  gte: this.timeRange.from,
                  lte: this.timeRange.to,
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
   * Searches for descendant nodes matching the specified IDs.
   *
   * @param client for making requests to Elasticsearch
   * @param nodes the unique IDs to search for in Elasticsearch
   * @param limit the upper limit of documents to returned
   */
  async search(
    client: IScopedClusterClient,
    nodes: NodeID[],
    limit: number
  ): Promise<FieldsObject[]> {
    const validNodes = validIDs(nodes);

    if (validNodes.length <= 0) {
      return [];
    }

    let response: estypes.SearchResponse<unknown>;
    if (this.schema.ancestry) {
      response = await client.asCurrentUser.search({
        body: this.queryWithAncestryArray(validNodes, this.schema.ancestry, limit),
        index: this.indexPatterns,
      });
    } else {
      response = await client.asCurrentUser.search({
        body: this.query(validNodes, limit),
        index: this.indexPatterns,
      });
    }

    /**
     * The returned values will look like:
     * [
     *  { 'schema_id_value': <value>, 'schema_parent_value': <value> }
     * ]
     *
     * So the schema fields are flattened ('process.parent.entity_id')
     */
    // @ts-expect-error @elastic/elasticsearch _source is optional
    return response.hits.hits.map((hit) => hit.fields);
  }
}
