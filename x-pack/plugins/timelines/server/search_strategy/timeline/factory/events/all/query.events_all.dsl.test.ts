/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventsQueries } from '../../../../../../common/api/search_strategy';
import { Direction } from '../../../../../../common/search_strategy';
import { buildTimelineEventsAllQuery } from './query.events_all.dsl';

describe('buildTimelineEventsAllQuery', () => {
  it('should return ip details query if index key is ipDetails', () => {
    const defaultIndex = ['.siem-signals-default'];
    const query = buildTimelineEventsAllQuery({
      factoryQueryType: TimelineEventsQueries.all,
      fields: [],
      defaultIndex,
      filterQuery: '',
      language: 'kuery',
      pagination: {
        activePage: 0,
        querySize: 100,
      },
      runtimeMappings: {},
      sort: [
        {
          direction: Direction.asc,
          field: '@timestamp',
          type: 'datetime',
          esTypes: ['date'],
        },
      ],
      timerange: {
        from: '',
        interval: '5m',
        to: '',
      },
    });
    expect(query).toMatchInlineSnapshot(`
      Object {
        "allow_no_indices": true,
        "body": Object {
          "_source": false,
          "aggregations": Object {
            "producers": Object {
              "terms": Object {
                "exclude": Array [
                  "alerts",
                ],
                "field": "kibana.alert.rule.producer",
              },
            },
          },
          "fields": Array [
            "signal.*",
            "kibana.alert.*",
            Object {
              "field": "@timestamp",
              "format": "strict_date_optional_time",
            },
          ],
          "from": 0,
          "query": Object {
            "bool": Object {
              "filter": Array [
                Object {
                  "match_all": Object {},
                },
              ],
            },
          },
          "runtime_mappings": Object {},
          "size": 100,
          "sort": Array [
            Object {
              "@timestamp": Object {
                "order": "asc",
                "unmapped_type": "date",
              },
            },
          ],
          "track_total_hits": true,
        },
        "ignore_unavailable": true,
        "index": Array [
          ".siem-signals-default",
        ],
      }
    `);
  });
});
