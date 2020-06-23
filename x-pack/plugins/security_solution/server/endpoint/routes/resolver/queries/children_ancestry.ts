/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ResolverEvent } from '../../../../../common/endpoint/types';
import { ResolverQuery } from './base';
import { PaginationBuilder } from '../utils/pagination';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';

/**
 * Builds a query for retrieving descendants of a node.
 */
export class ChildrenAncestryQuery extends ResolverQuery<ResolverEvent[]> {
  constructor(
    private readonly pagination: PaginationBuilder,
    indexPattern: string,
    endpointID?: string
  ) {
    super(indexPattern, endpointID);
  }

  protected legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject {
    throw new Error('Legacy query for children ancestry is not supported');
  }

  protected query(entityIDs: string[]): JsonObject {
    return {
      query: {
        bool: {
          filter: [
            {
              terms: { 'process.parent.entity_id': entityIDs },
            },
            {
              term: { 'event.category': 'process' },
            },
            {
              term: { 'event.kind': 'event' },
            },
            {
              term: { 'event.type': 'start' },
            },
          ],
        },
      },
      ...this.pagination.buildQueryFields('event.id'),
    };
  }

  formatResponse(response: SearchResponse<ResolverEvent>): ResolverEvent[] {
    return ResolverQuery.getResults(response);
  }
}
