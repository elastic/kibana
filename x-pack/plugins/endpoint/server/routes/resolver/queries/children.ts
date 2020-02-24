/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';

export class ChildrenQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePIDs: string[], index: string) {
    return {
      body: this.paginateBy('endgame.serial_event_id', {
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
                // Corner case, we could only have a process_running or process_terminated
                // so to solve this we'll probably want to either search for all of them and only return one if that's
                // possible in elastic search or in memory pull out a single event to return
                // https://github.com/elastic/endpoint-app-team/issues/168
                term: { 'event.type': 'process_start' },
              },
            ],
          },
        },
      }),
      index,
    };
  }

  protected query(entityIDs: string[], index: string) {
    return {
      body: this.paginateBy('event.id', {
        query: {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      terms: { 'endpoint.process.parent.entity_id': entityIDs },
                    },
                    {
                      terms: { 'process.parent.entity_id': entityIDs },
                    },
                  ],
                },
              },
              {
                term: { 'event.category': 'process' },
              },
              {
                // Corner case, we could only have a process_running or process_terminated
                // so to solve this we'll probably want to either search for all of them and only return one if that's
                // possible in elastic search or in memory pull out a single event to return
                // https://github.com/elastic/endpoint-app-team/issues/168
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
