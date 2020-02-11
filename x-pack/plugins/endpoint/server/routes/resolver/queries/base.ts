/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { JSONish } from '../../../types';
import { PaginationParams } from '../common';
import { EndpointAppConstants } from '../../../../common/types';

export abstract class ResolverQuery {
  private readonly legacyEntityIDDelimiter = '-';
  private readonly legacyEntityPrefix = 'endgame-';
  constructor(protected readonly pagination?: PaginationParams) {}

  private parseLegacyEntityID(entityID: string): { endpointID: string; uniquePID: string } | null {
    if (!entityID.startsWith(this.legacyEntityPrefix)) {
      return null;
    }
    const fields = entityID.split(this.legacyEntityIDDelimiter, 2);
    if (fields.length !== 3) {
      return null;
    }
    return { endpointID: fields[2], uniquePID: fields[1] };
  }

  protected paginateBy(field: string, query: any) {
    if (!this.pagination) {
      return query;
    }
    const { size, timestamp, eventID } = this.pagination;
    query.sort = [{ '@timestamp': 'asc' }, { [field]: 'asc' }];
    query.size = size;
    if (timestamp && eventID) {
      query.search_after = [timestamp, eventID];
    }
    return query;
  }

  protected abstract legacyQuery(endpointID: string, uniquePID: string, index: string): JSONish;
  protected abstract query(entityID: string, index: string): JSONish;

  build(entityID: string) {
    const legacyID = this.parseLegacyEntityID(entityID);
    if (legacyID !== null) {
      const { endpointID, uniquePID } = legacyID;
      return this.legacyQuery(endpointID, uniquePID, EndpointAppConstants.LEGACY_EVENT_INDEX_NAME);
    }

    return this.query(entityID, EndpointAppConstants.EVENT_INDEX_NAME);
  }
}
