/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTimelineDetailsQuery } from './query.events_details.dsl';

describe('buildTimelineDetailsQuery', () => {
  it('returns the expected query', () => {
    const indexName = '.siem-signals-default';
    const eventId = 'f0a936d50b5b3a5a193d415459c14587fe633f7e519df7b5dc151d56142680e3';
    const docValueFields = [
      { field: '@timestamp' },
      { field: 'agent.ephemeral_id' },
      { field: 'agent.id' },
      { field: 'agent.name' },
    ];

    const query = buildTimelineDetailsQuery(indexName, eventId, docValueFields);

    expect(query).toMatchInlineSnapshot(`
      Object {
        "allowNoIndices": true,
        "body": Object {
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
          "query": Object {
            "terms": Object {
              "_id": Array [
                "f0a936d50b5b3a5a193d415459c14587fe633f7e519df7b5dc151d56142680e3",
              ],
            },
          },
        },
        "ignoreUnavailable": true,
        "index": ".siem-signals-default",
        "size": 1,
      }
    `);
  });
});
