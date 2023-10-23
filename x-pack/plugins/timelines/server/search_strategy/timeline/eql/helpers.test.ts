/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEqlRequestOptions } from '../../../../common/api/search_strategy';
import { Direction } from '../../../../common/search_strategy';
import { buildEqlDsl, parseEqlResponse } from './helpers';
import { eventsResponse, sequenceResponse } from './__mocks__';
const defaultArgs = {
  defaultIndex: ['logs-endpoint.events*'],
  runtimeMappings: {},
  fieldRequested: [
    '@timestamp',
    'message',
    'event.category',
    'event.action',
    'host.name',
    'source.ip',
    'destination.ip',
  ],
  fields: [],
  filterQuery: 'sequence by host.name↵[any where true]↵[any where true]↵[any where true]',
  id: 'FkgzdTM3YXEtUmN1cVI3VS1wZ1lrdkEgVW1GSWZEX2lRZmVwQmw2c1V5RWsyZzoyMzA1MjAzMDM=',
  language: 'eql' as TimelineEqlRequestOptions['language'],
};
describe('Search Strategy EQL helper', () => {
  describe('#buildEqlDsl', () => {
    it('happy path with no options', () => {
      expect(
        buildEqlDsl({
          ...defaultArgs,
          pagination: { activePage: 0, querySize: 25 },
          sort: [
            {
              direction: Direction.desc,
              esTypes: ['date'],
              field: '@timestamp',
              type: 'date',
            },
          ],
          timerange: {
            interval: '12h',
            from: '2021-02-07T21:50:31.318Z',
            to: '2021-02-08T21:50:31.319Z',
          },
        })
      ).toMatchInlineSnapshot(`
        Object {
          "allow_no_indices": true,
          "body": Object {
            "event_category_field": "event.category",
            "fields": Array [
              Object {
                "field": "*",
                "include_unmapped": true,
              },
              Object {
                "field": "@timestamp",
                "format": "strict_date_optional_time",
              },
            ],
            "filter": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "@timestamp": Object {
                        "format": "strict_date_optional_time",
                        "gte": "2021-02-07T21:50:31.318Z",
                        "lte": "2021-02-08T21:50:31.319Z",
                      },
                    },
                  },
                ],
              },
            },
            "query": "sequence by host.name↵[any where true]↵[any where true]↵[any where true]",
            "size": 100,
            "timestamp_field": "@timestamp",
          },
          "ignore_unavailable": true,
          "index": Array [
            "logs-endpoint.events*",
          ],
        }
      `);
    });

    it('happy path with EQL options', () => {
      expect(
        buildEqlDsl({
          ...defaultArgs,
          pagination: { activePage: 1, querySize: 2 },
          sort: [
            {
              direction: Direction.desc,
              esTypes: ['date'],
              field: '@timestamp',
              type: 'date',
            },
          ],
          timerange: {
            interval: '12h',
            from: '2021-02-07T21:50:31.318Z',
            to: '2021-02-08T21:50:31.319Z',
          },
          eventCategoryField: 'event.super.category',
          tiebreakerField: 'event.my.sequence',
          timestampField: 'event.ingested',
        })
      ).toMatchInlineSnapshot(`
        Object {
          "allow_no_indices": true,
          "body": Object {
            "event_category_field": "event.super.category",
            "fields": Array [
              Object {
                "field": "*",
                "include_unmapped": true,
              },
              Object {
                "field": "@timestamp",
                "format": "strict_date_optional_time",
              },
            ],
            "filter": Object {
              "bool": Object {
                "filter": Array [
                  Object {
                    "range": Object {
                      "event.ingested": Object {
                        "format": "strict_date_optional_time",
                        "gte": "2021-02-07T21:50:31.318Z",
                        "lte": "2021-02-08T21:50:31.319Z",
                      },
                    },
                  },
                ],
              },
            },
            "query": "sequence by host.name↵[any where true]↵[any where true]↵[any where true]",
            "size": 100,
            "tiebreaker_field": "event.my.sequence",
            "timestamp_field": "event.ingested",
          },
          "ignore_unavailable": true,
          "index": Array [
            "logs-endpoint.events*",
          ],
        }
      `);
    });
  });

  describe('#parseEqlResponse', () => {
    it('format events', async () => {
      const result = await parseEqlResponse(
        {
          ...defaultArgs,
          pagination: { activePage: 0, querySize: 2 },
          sort: [
            {
              direction: Direction.desc,
              field: '@timestamp',
              esTypes: ['date'],
              type: 'date',
            },
          ],
          timerange: {
            interval: '12h',
            from: '2021-02-07T21:50:31.318Z',
            to: '2021-02-08T21:50:31.319Z',
          },
        },
        eventsResponse
      );

      expect(result.edges).toMatchInlineSnapshot(`Array []`);
    });
    it('sequence events', async () => {
      const result = await parseEqlResponse(
        {
          ...defaultArgs,
          pagination: { activePage: 3, querySize: 2 },
          sort: [
            {
              direction: Direction.desc,
              esTypes: ['date'],
              field: '@timestamp',
              type: 'date',
            },
          ],
          timerange: {
            interval: '12h',
            from: '2021-02-07T21:50:31.318Z',
            to: '2021-02-08T21:50:31.319Z',
          },
        },
        sequenceResponse
      );
      expect(result.edges).toMatchInlineSnapshot(`Array []`);
    });
  });
});
