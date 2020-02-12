/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import { EndpointAppConstants } from '../../../../common/types';
import { JSONish } from '../../../types';
import { paginate, paginatedResults, PaginationParams } from '../pagination';
import { parseLegacyEntityID } from '../utils/normalize';

export abstract class ResolverQuery {
  private endpointID: string | null;
  private entityID: string;
  private pagination: PaginationParams | null;

  constructor(entityID: string, pagination?: PaginationParams) {
    this.pagination = pagination;
    const legacyID = parseLegacyEntityID(entityID);
    if (legacyID !== null) {
      const { endpointID, uniquePID } = legacyID;
      this.endpointID = endpointID;
      this.entityID = uniquePID;
    } else {
      this.entityID = entityID;
    }
  }

  protected paginateBy(field: string, query: any) {
    if (!this.pagination) {
      return query;
    }
    return paginate(this.pagination, field, query);
  }

  build(overrides?: string[]) {
    const ids = overrides || [this.entityID];

    if (this.endpointID) {
      return this.legacyQuery(this.endpointID, ids, EndpointAppConstants.LEGACY_EVENT_INDEX_NAME);
    }
    return this.query(ids, EndpointAppConstants.EVENT_INDEX_NAME);
  }

  async search(client: IScopedClusterClient, overrides?: string[]) {
    return paginatedResults(await client.callAsCurrentUser('search', this.build(overrides)));
  }

  protected abstract legacyQuery(endpointID: string, uniquePID: string, index: string): JSONish;
  protected abstract query(entityID: string, index: string): JSONish;
}
