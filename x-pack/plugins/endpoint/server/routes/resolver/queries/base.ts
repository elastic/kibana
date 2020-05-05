/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../common/types';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { legacyEventIndexPattern } from './legacy_event_index_pattern';

export interface Query {
  build(ids: string | string[]): JsonObject;
}

export abstract class ResolverQuery<T> implements Query {
  constructor(private readonly indexPattern: string, private readonly endpointID?: string) {}

  private static createIdsArray(ids: string | string[]): string[] {
    return Array.isArray(ids) ? ids : [ids];
  }

  // todo make this specific to `search` and add a new method that returns the `msearch` style
  // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/msearch_examples.html
  build(ids: string | string[]) {
    const idsArray = ResolverQuery.createIdsArray(ids);
    if (this.endpointID) {
      return this.legacyQuery(this.endpointID, idsArray, legacyEventIndexPattern);
    }
    return this.query(idsArray, this.indexPattern);
  }

  protected abstract legacyQuery(
    endpointID: string,
    uniquePIDs: string[],
    index: string
  ): JsonObject;
  protected abstract query(entityIDs: string[], index: string): JsonObject;

  public abstract formatResults(response: SearchResponse<ResolverEvent>): T;
}
