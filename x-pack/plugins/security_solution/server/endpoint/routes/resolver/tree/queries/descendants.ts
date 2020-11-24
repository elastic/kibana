/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ApiResponse } from '@elastic/elasticsearch';
import { IScopedClusterClient } from 'src/core/server';
import { FieldsObject } from '../../../../../../common/endpoint/types';
import { JsonObject, JsonValue } from '../../../../../../../../../src/plugins/kibana_utils/common';
import { NodeID, Schema, Timerange, docValueFields } from '../utils/index';

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
  private readonly docValueFields: JsonValue[];
  constructor({ schema, indexPatterns, timerange }: DescendantsParams) {
    this.docValueFields = docValueFields(schema);
    this.schema = schema;
    this.indexPatterns = indexPatterns;
    this.timerange = timerange;
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
                  gte: this.timerange.from,
                  lte: this.timerange.to,
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
