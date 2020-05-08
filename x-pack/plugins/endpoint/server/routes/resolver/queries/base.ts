/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'kibana/server';
import { ResolverEvent } from '../../../../common/types';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { legacyEventIndexPattern } from './legacy_event_index_pattern';
import { MSearchQuery } from './multi_searcher';

export abstract class ResolverQuery<T> implements MSearchQuery {
  constructor(private readonly indexPattern: string, private readonly endpointID?: string) {}

  private static createIdsArray(ids: string | string[]): string[] {
    return Array.isArray(ids) ? ids : [ids];
  }

  private static formatBody(body: JsonObject, index: string): JsonObject {
    return {
      body,
      index,
    };
  }

  private buildQuery(ids: string | string[]): { query: JsonObject; index: string } {
    const idsArray = ResolverQuery.createIdsArray(ids);
    if (this.endpointID) {
      return { query: this.legacyQuery(this.endpointID, idsArray), index: legacyEventIndexPattern };
    }
    return { query: this.query(idsArray), index: this.indexPattern };
  }

  private buildSearch(ids: string | string[]) {
    const { query, index } = this.buildQuery(ids);
    return ResolverQuery.formatBody(query, index);
  }

  protected static getResults(response: SearchResponse<ResolverEvent>): ResolverEvent[] {
    return response.hits.hits.map(hit => hit._source);
  }

  buildMSearch(ids: string | string[]): JsonObject[] {
    const { query, index } = this.buildQuery(ids);
    return [{ index }, query];
  }

  async search(client: IScopedClusterClient, ids: string | string[]): Promise<T> {
    const res: SearchResponse<ResolverEvent> = await client.callAsCurrentUser(
      'search',
      this.buildSearch(ids)
    );
    return this.formatResponse(res);
  }

  protected abstract legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject;
  protected abstract query(entityIDs: string[]): JsonObject;
  protected abstract formatResponse(response: SearchResponse<ResolverEvent>): T;
}
