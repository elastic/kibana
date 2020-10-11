/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SearchResponse } from 'elasticsearch';
import { ECSField } from '../../../../../common/endpoint/types';
import { ResolverQuery } from './base';
import { ChildrenPaginationBuilder } from '../utils/children_pagination';
import { JsonObject } from '../../../../../../../../src/plugins/kibana_utils/common';

/**
 * This type represents the document returned from ES for a legacy event when using the ChildrenQuery to fetch legacy events.
 * It contains only the necessary fields that the children api needs to process the results before
 * it requests the full lifecycle information for the children in a later query.
 */
export type LegacyChildEvent = Partial<{
  '@timestamp': ECSField<number>;
  event: Partial<{
    type: ECSField<string>;
    action: ECSField<string>;
  }>;
  endgame: Partial<{
    serial_event_id: ECSField<number>;
    unique_pid: ECSField<number>;
    unique_ppid: ECSField<number>;
  }>;
}>;

/**
 * This type represents the document returned from ES for an event when using the ChildrenQuery to fetch legacy events.
 * It contains only the necessary fields that the children api needs to process the results before
 * it requests the full lifecycle information for the children in a later query.
 */
export type EndpointChildEvent = Partial<{
  '@timestamp': ECSField<number>;
  event: Partial<{
    type: ECSField<string>;
    sequence: ECSField<number>;
  }>;
  process: Partial<{
    entity_id: ECSField<string>;
    parent: Partial<{
      entity_id: ECSField<string>;
    }>;
    Ext: Partial<{
      ancestry: ECSField<string>;
    }>;
  }>;
}>;

export type ChildEvent = EndpointChildEvent | LegacyChildEvent;

/**
 * Builds a query for retrieving descendants of a node.
 * The first type `ChildEvent[]` represents the final formatted result. The second type `ChildEvent` defines the type
 * used in the `SearchResponse<T>` field returned from the ES query.
 */
export class ChildrenQuery extends ResolverQuery<ChildEvent[], ChildEvent> {
  constructor(
    private readonly pagination: ChildrenPaginationBuilder,
    indexPattern: string | string[],
    endpointID?: string
  ) {
    super(indexPattern, endpointID);
  }

  protected legacyQuery(endpointID: string, uniquePIDs: string[]): JsonObject {
    const paginationFields = this.pagination.buildQueryFields('endgame.serial_event_id');
    return {
      _source: [
        '@timestamp',
        'endgame.serial_event_id',
        'endgame.unique_pid',
        'endgame.unique_ppid',
        'event.type',
        'event.action',
      ],
      collapse: {
        field: 'endgame.unique_pid',
      },
      size: paginationFields.size,
      sort: paginationFields.sort,
      query: {
        bool: {
          filter: [
            ...paginationFields.filters,
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
    // we don't have to include the `event.id` in the source response because it is not needed for processing
    // the data returned by ES, it is only used for breaking ties when ES is doing the search
    const paginationFields = this.pagination.buildQueryFields('event.id');
    return {
      _source: [
        '@timestamp',
        'event.type',
        'event.sequence',
        'process.entity_id',
        'process.parent.entity_id',
        'process.Ext.ancestry',
      ],
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
      size: paginationFields.size,
      sort: paginationFields.sort,
      query: {
        bool: {
          filter: [
            ...paginationFields.filters,
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

  formatResponse(response: SearchResponse<ChildEvent>): ChildEvent[] {
    return this.getResults(response);
  }
}
