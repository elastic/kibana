/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';

export class ChildrenQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePIDs: string[], index: string) {
    const paginator = this.paginateBy('endgame.serial_event_id', 'endgame.unique_ppid');
    return {
      body: paginator({
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
                      term: { 'event.type': 'process_start' },
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
      }),
      index,
    };
  }

  protected query(entityIDs: string[], index: string) {
    const paginator = this.paginateBy('event.id', 'process.parent.entity_id');
    return {
      body: paginator({
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
      }),
      index,
    };
  }
}
