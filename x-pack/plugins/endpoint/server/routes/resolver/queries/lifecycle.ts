/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';

export class LifecycleQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePID: string, index: string) {
    return {
      body: {
        query: {
          bool: {
            filter: [
              {
                term: { 'endgame.unique_pid': uniquePID },
              },
              {
                match: { 'agent.id': endpointID },
              },
              {
                term: { 'event.category': 'process' },
              },
            ],
          },
        },
        sort: [{ '@timestamp': 'asc' }],
      },
      index,
    };
  }

  protected query(entityID: string, index: string) {
    return {
      body: {
        query: {
          bool: {
            filter: [
              {
                match: { 'endpoint.process.entity_id': entityID },
              },
              {
                term: { 'event.category': 'process' },
              },
            ],
          },
        },
        sort: [{ '@timestamp': 'asc' }],
      },
      index,
    };
  }
}
