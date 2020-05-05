/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';

export class EventsQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePIDs: string[], index: string): JsonObject {
    const paginator = this.paginateBy('endgame.serial_event_id', 'endgame.unique_pid');
    return {
      body: paginator({
        query: {
          bool: {
            filter: [
              {
                terms: { 'endgame.unique_pid': uniquePIDs },
              },
              {
                term: { 'agent.id': endpointID },
              },
              {
                term: { 'event.kind': 'event' },
              },
              {
                bool: {
                  must_not: {
                    term: { 'event.category': 'process' },
                  },
                },
              },
            ],
          },
        },
      }),
      index,
    };
  }

  protected query(entityIDs: string[], index: string): JsonObject {
    const paginator = this.paginateBy('event.id', 'process.entity_id');
    return {
      body: paginator({
        query: {
          bool: {
            filter: [
              {
                terms: { 'process.entity_id': entityIDs },
              },
              {
                term: { 'event.kind': 'event' },
              },
              {
                bool: {
                  must_not: {
                    term: { 'event.category': 'process' },
                  },
                },
              },
            ],
          },
        },
      }),
      index,
    };
  }
}
