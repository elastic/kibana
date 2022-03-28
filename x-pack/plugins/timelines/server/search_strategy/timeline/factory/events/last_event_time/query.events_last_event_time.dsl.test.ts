/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LastEventIndexKey,
} from '../../../../../../common/search_strategy';
import { buildLastEventTimeQuery } from './query.events_last_event_time.dsl';

describe('buildLastEventTimeQuery', () => {
  it('should return ip details query if index key is ipDetails', () => {
    const defaultIndex = ['.siem-signals-default'];
    const docValueFields = [
      { field: '@timestamp' },
      { field: 'agent.ephemeral_id' },
      { field: 'agent.id' },
      { field: 'agent.name' },
    ];

    const query = buildLastEventTimeQuery({ indexKey: LastEventIndexKey.ipDetails, details: { ip: '12345567'}, defaultIndex, docValueFields});
    expect(query).toMatchInlineSnapshot(`
      Object {
        "allow_no_indices": true,
        "body": Object {
          "_source": true,
          "docvalue_fields": Array [
            Object {
              "field": "@timestamp",
            },
            Object {
              "field": "agent.ephemeral_id",
            },
            Object {
              "field": "agent.id",
            },
            Object {
              "field": "agent.name",
            },
          ],
          "fields": Array [
            Object {
              "field": "*",
              "include_unmapped": true,
            },
          ],
          "query": Object {
            "terms": Object {
              "_id": Array [
                "f0a936d50b5b3a5a193d415459c14587fe633f7e519df7b5dc151d56142680e3",
              ],
            },
          },
          "runtime_mappings": Object {},
        },
        "ignore_unavailable": true,
        "index": ".siem-signals-default",
        "size": 1,
      }
    `);
  });
});
