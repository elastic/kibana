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
export class ChildrenQuery extends ResolverQuery<ResolverEvent[]> {
  constructor(
    private readonly pagination: PaginationBuilder,
    indexPattern: string | string[],
    endpointID?: string
  ) {
    super(indexPattern, endpointID);
  }

  protected legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject {
    const paginationFields = this.pagination.buildQueryFields('endgame.serial_event_id');
    return {
      collapse: {
        field: 'endgame.unique_pid',
      },
      size: paginationFields.size,
      sort: paginationFields.sort,
      query: {
        bool: {
          filter: [
            {
              terms: { 'endgame.unique_ppid': uniquePIDs },
            },
            {
              term: { 'agent.id': endpointID },
            },
            {
              term: { 'event.category': 'process' },
            },
            {
              term: { 'event.kind': 'event' },
            },
            {
              bool: {
                should: [
                  {
                    terms: { 'event.type': ['process_start', 'already_running'] },
                  },
                  {
                    term: { 'event.action': 'fork_event' },
                  },
                ],
              },
            },
          ],
        },
      },
    };
  }

  protected query(entityIDs: string[]): JsonObject {
    const paginationFields = this.pagination.buildQueryFieldsAsInterface('event.id');
    return {
      /**
       * Using collapse here will only return a single event per occurrence of a process.entity_id. The events are sorted
       * based on timestamp in ascending order so it will be the first event that ocurred. The actual type of event that
       * we receive for this query doesn't really matter (whether it is a start, info, or exec for a particular entity_id).
       * All this is trying to accomplish is removing duplicate events that indicate a process existed for a node. We
       * only need to know that a process existed and it's it's ancestry array and the process.entity_id fields because
       * we will use it to query for the next set of descendants.
       *
       * The reason it is important to only receive 1 event per occurrence of a process.entity_id is it allows us to avoid
       * ES 10k limit most of the time. If instead we received multiple events with the same process.entity_id that would
       * reduce the maximum number of unique children processes we could retrieve in a single query.
       */
      collapse: {
        field: 'process.entity_id',
      },
      // do not set the search_after field because collapse does not work with it
      size: paginationFields.size,
      sort: paginationFields.sort,
      query: {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  {
                    terms: { 'process.parent.entity_id': entityIDs },
                  },
                  {
                    terms: { 'process.Ext.ancestry': entityIDs },
                  },
                ],
              },
            },
            {
              exists: {
                field: 'process.entity_id',
              },
            },
            {
              bool: {
                must_not: {
                  term: { 'process.entity_id': '' },
                },
              },
            },
            {
              term: { 'event.category': 'process' },
            },
            {
              term: { 'event.kind': 'event' },
            },
            {
              terms: { 'event.type': ['start', 'info', 'change'] },
            },
          ],
        },
      },
    };
  }

  formatResponse(response: SearchResponse<ResolverEvent>): ResolverEvent[] {
    return this.getResults(response);
  }
}
