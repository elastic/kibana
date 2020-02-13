/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { EndpointAppConstants } from '../../../../common/types';
import { paginate, paginatedResults, PaginationParams } from '../utils/pagination';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';

export abstract class ResolverQuery {
  constructor(
    private readonly endpointID?: string,
    private readonly pagination?: PaginationParams
  ) {}

  protected paginateBy(field: string, query: JsonObject) {
    if (!this.pagination) {
      return query;
    }
    return paginate(this.pagination, field, query);
  }

  build(...ids: string[]) {
    if (this.endpointID) {
      return this.legacyQuery(this.endpointID, ids, EndpointAppConstants.LEGACY_EVENT_INDEX_NAME);
    }
    return this.query(ids, EndpointAppConstants.EVENT_INDEX_NAME);
  }

  async search(client: IScopedClusterClient, ...ids: string[]) {
    return paginatedResults(await client.callAsCurrentUser('search', this.build(...ids)));
  }

  protected abstract legacyQuery(
    endpointID: string,
    uniquePIDs: string[],
    index: string
  ): JsonObject;
  protected abstract query(entityIDs: string[], index: string): JsonObject;
}
