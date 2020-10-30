/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { JsonObject, JsonValue } from '../../../../../../../../../src/plugins/kibana_utils/common';

export type Nodes = Array<string | number>;

export interface EdgeDefinition {
  id: string;
  parentID: string;
}

export interface Schema {
  ancestry?: string;
  id: string;
  parent: string;
}

export class UniqueID {
  public readonly sourceFilter: string[];
  constructor(public readonly idSchema: Schema) {
    this.sourceFilter = ['@timestamp', this.idSchema.id, this.idSchema.parent];
    if (this.idSchema.ancestry) {
      this.sourceFilter.push(this.idSchema.ancestry);
    }
  }
}

export function sourceFilter(schema: Schema) {
  const filter = ['@timestamp', schema.id, schema.parent];
  if (schema.ancestry) {
    filter.push(schema.ancestry);
  }
  return filter;
}

export function getNodesFromAggs(idField: string, aggregations: any) {
  // TODO fix types
  aggregations[idField].buckets.reduce((results: Array<Record<string, any>>, bucket: Aggs) => {
    results.push(...bucket.singleEvent.hits.hits.map((hit) => hit._source));
    return results;
  });
}

interface Aggs {
  singleEvent: SearchResponse<Record<string, any>>;
}
