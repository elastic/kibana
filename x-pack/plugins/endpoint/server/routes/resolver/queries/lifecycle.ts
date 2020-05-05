/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverQuery } from './base';
import { JsonObject } from '../../../../../../../src/plugins/kibana_utils/public';

export class LifecycleQuery extends ResolverQuery {
  protected legacyQuery(endpointID: string, uniquePIDs: string[], index: string): JsonObject {
    return {
      body: {
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
                term: { 'event.category': 'process' },
              },
            ],
          },
        },
        size: 10000,
        sort: [{ '@timestamp': 'asc' }],
      },
      index,
    };
  }

  protected query(entityIDs: string[], index: string): JsonObject {
    return {
      body: {
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
                term: { 'event.category': 'process' },
              },
            ],
          },
        },
        size: 10000,
        sort: [{ '@timestamp': 'asc' }],
      },
      index,
    };
  }
}
