/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient } from 'kibana/server';
import { ResolverEvent } from '../../../../common/types';
import {
  paginate,
  paginatedResults,
  PaginationParams,
  PaginatedResults,
} from '../utils/pagination';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';
import { legacyEventIndexPattern } from './legacy_event_index_pattern';

export abstract class ResolverQuery {
  constructor(
    private readonly indexPattern: string,
    private readonly endpointID?: string,
    private readonly pagination?: PaginationParams
  ) {}

  protected paginateBy(tiebreaker: string, aggregator: string) {
    return (query: JsonObject) => {
      if (!this.pagination) {
        return query;
      }
      return paginate(this.pagination, tiebreaker, aggregator, query);
    };
  }

  build(...ids: string[]) {
    if (this.endpointID) {
      return this.legacyQuery(this.endpointID, ids, legacyEventIndexPattern);
    }
    return this.query(ids, this.indexPattern);
  }

  async search(client: IScopedClusterClient, ...ids: string[]) {
    return this.postSearch(await client.callAsCurrentUser('search', this.build(...ids)));
  }

  protected postSearch(response: SearchResponse<ResolverEvent>): PaginatedResults {
    return paginatedResults(response);
  }

  protected abstract legacyQuery(
    endpointID: string,
    uniquePIDs: string[],
    index: string
  ): JsonObject;
  protected abstract query(entityIDs: string[], index: string): JsonObject;
}
