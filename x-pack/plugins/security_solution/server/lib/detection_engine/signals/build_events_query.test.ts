/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEqlSearchRequest, buildEventsSearchQuery } from './build_events_query';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';
import { buildExceptionFilter } from '@kbn/lists-plugin/server/services/exception_lists';

const emptyFilter = {
  bool: {
    must: [],
    filter: [],
    should: [],
    must_not: [],
  },
};

describe('create_signals', () => {
  test('it builds a now-5m up to today filter', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      runtimeMappings: undefined,
    });
    expect(query).toEqual({
      allow_no_indices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignore_unavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {},
              {
                range: {
                  '@timestamp': {
                    gte: 'now-5m',
                    lte: 'today',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
        fields: [
          {
            field: '*',
            include_unmapped: true,
          },
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        sort: [
          {
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });

  test('it builds a now-5m up to today filter with timestampOverride', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: 'event.ingested',
      secondaryTimestamp: '@timestamp',
      runtimeMappings: undefined,
    });
    expect(query).toEqual({
      allow_no_indices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignore_unavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {},
              {
                bool: {
                  should: [
                    {
                      range: {
                        'event.ingested': {
                          gte: 'now-5m',
                          lte: 'today',
                          format: 'strict_date_optional_time',
                        },
                      },
                    },
                    {
                      bool: {
                        filter: [
                          {
                            range: {
                              '@timestamp': {
                                gte: 'now-5m',
                                lte: 'today',
                                format: 'strict_date_optional_time',
                              },
                            },
                          },
                          {
                            bool: {
                              must_not: {
                                exists: {
                                  field: 'event.ingested',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        fields: [
          {
            field: '*',
            include_unmapped: true,
          },
          {
            field: 'event.ingested',
            format: 'strict_date_optional_time',
          },
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        sort: [
          {
            'event.ingested': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
          {
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });

  test('it builds a filter without @timestamp fallback if `secondaryTimestamp` is undefined', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: 'event.ingested',
      secondaryTimestamp: undefined,
      runtimeMappings: undefined,
    });
    expect(query).toEqual({
      allow_no_indices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignore_unavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {},
              {
                range: {
                  'event.ingested': {
                    gte: 'now-5m',
                    lte: 'today',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
        fields: [
          {
            field: '*',
            include_unmapped: true,
          },
          {
            field: 'event.ingested',
            format: 'strict_date_optional_time',
          },
        ],
        sort: [
          {
            'event.ingested': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });

  test('if searchAfterSortIds is a valid sortId string', () => {
    const fakeSortId = '123456789012';
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: [fakeSortId],
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      runtimeMappings: undefined,
    });
    expect(query).toEqual({
      allow_no_indices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignore_unavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {},
              {
                range: {
                  '@timestamp': {
                    gte: 'now-5m',
                    lte: 'today',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
        fields: [
          {
            field: '*',
            include_unmapped: true,
          },
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        search_after: [fakeSortId],
        sort: [
          {
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });
  test('if searchAfterSortIds is a valid sortId number', () => {
    const fakeSortIdNumber = 123456789012;
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: [fakeSortIdNumber],
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      runtimeMappings: undefined,
    });
    expect(query).toEqual({
      allow_no_indices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignore_unavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {},
              {
                range: {
                  '@timestamp': {
                    gte: 'now-5m',
                    lte: 'today',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
        fields: [
          {
            field: '*',
            include_unmapped: true,
          },
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        search_after: [fakeSortIdNumber],
        sort: [
          {
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });
  test('if aggregations is not provided it should not be included', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      runtimeMappings: undefined,
    });
    expect(query).toEqual({
      allow_no_indices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignore_unavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {},
              {
                range: {
                  '@timestamp': {
                    gte: 'now-5m',
                    lte: 'today',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
        fields: [
          {
            field: '*',
            include_unmapped: true,
          },
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        sort: [
          {
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });

  test('if aggregations is provided it should be included', () => {
    const query = buildEventsSearchQuery({
      aggregations: {
        tags: {
          terms: {
            field: 'tag',
          },
        },
      },
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      runtimeMappings: undefined,
    });
    expect(query).toEqual({
      allow_no_indices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignore_unavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {},
              {
                range: {
                  '@timestamp': {
                    gte: 'now-5m',
                    lte: 'today',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
        fields: [
          {
            field: '*',
            include_unmapped: true,
          },
          {
            field: '@timestamp',
            format: 'strict_date_optional_time',
          },
        ],
        aggregations: {
          tags: {
            terms: {
              field: 'tag',
            },
          },
        },
        sort: [
          {
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });

  test('if trackTotalHits is provided it should be included', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      trackTotalHits: false,
      runtimeMappings: undefined,
    });
    expect(query.track_total_hits).toEqual(false);
  });

  test('if sortOrder is provided it should be included', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      sortOrder: 'desc',
      trackTotalHits: false,
      runtimeMappings: undefined,
    });
    expect(query.body.sort[0]).toEqual({
      '@timestamp': {
        order: 'desc',
        unmapped_type: 'date',
      },
    });
  });

  test('it respects sort order for timestampOverride', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: 'event.ingested',
      secondaryTimestamp: '@timestamp',
      sortOrder: 'desc',
      runtimeMappings: undefined,
    });
    expect(query.body.sort[0]).toEqual({
      'event.ingested': {
        order: 'desc',
        unmapped_type: 'date',
      },
    });
    expect(query.body.sort[1]).toEqual({
      '@timestamp': {
        order: 'desc',
        unmapped_type: 'date',
      },
    });
  });

  test('it respects overriderBody params', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp: undefined,
      runtimeMappings: undefined,
      overrideBody: {
        _source: false,
        fields: ['@timestamp'],
      },
    });
    expect(query).toEqual({
      allow_no_indices: true,
      index: ['auditbeat-*'],
      size: 100,
      runtime_mappings: undefined,
      track_total_hits: undefined,
      ignore_unavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {},
              {
                range: {
                  '@timestamp': {
                    gte: 'now-5m',
                    lte: 'today',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
        _source: false,
        fields: ['@timestamp'],
        runtime_mappings: undefined,
        sort: [
          {
            '@timestamp': {
              order: 'asc',
              unmapped_type: 'date',
            },
          },
        ],
      },
    });
  });

  describe('buildEqlSearchRequest', () => {
    test('should build a basic request with time range', () => {
      const request = buildEqlSearchRequest({
        query: 'process where true',
        index: ['testindex1', 'testindex2'],
        from: 'now-5m',
        to: 'now',
        size: 100,
        filters: undefined,
        primaryTimestamp: '@timestamp',
        secondaryTimestamp: undefined,
        runtimeMappings: undefined,
        eventCategoryOverride: undefined,
        exceptionFilter: undefined,
      });
      expect(request).toEqual({
        allow_no_indices: true,
        index: ['testindex1', 'testindex2'],
        body: {
          size: 100,
          query: 'process where true',
          runtime_mappings: undefined,
          filter: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-5m',
                      lte: 'now',
                      format: 'strict_date_optional_time',
                    },
                  },
                },
                emptyFilter,
              ],
            },
          },
          fields: [
            {
              field: '*',
              include_unmapped: true,
            },
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
        },
      });
    });

    test('should build a request with timestamp and event category overrides', () => {
      const request = buildEqlSearchRequest({
        query: 'process where true',
        index: ['testindex1', 'testindex2'],
        from: 'now-5m',
        to: 'now',
        size: 100,
        filters: undefined,
        primaryTimestamp: 'event.ingested',
        secondaryTimestamp: '@timestamp',
        runtimeMappings: undefined,
        eventCategoryOverride: 'event.other_category',
        timestampField: undefined,
        exceptionFilter: undefined,
      });
      expect(request).toEqual({
        allow_no_indices: true,
        index: ['testindex1', 'testindex2'],
        body: {
          event_category_field: 'event.other_category',
          size: 100,
          query: 'process where true',
          runtime_mappings: undefined,
          filter: {
            bool: {
              filter: [
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      {
                        range: {
                          'event.ingested': {
                            lte: 'now',
                            gte: 'now-5m',
                            format: 'strict_date_optional_time',
                          },
                        },
                      },
                      {
                        bool: {
                          filter: [
                            {
                              range: {
                                '@timestamp': {
                                  lte: 'now',
                                  gte: 'now-5m',
                                  format: 'strict_date_optional_time',
                                },
                              },
                            },
                            {
                              bool: {
                                must_not: {
                                  exists: {
                                    field: 'event.ingested',
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                emptyFilter,
              ],
            },
          },
          fields: [
            {
              field: '*',
              include_unmapped: true,
            },
            {
              field: 'event.ingested',
              format: 'strict_date_optional_time',
            },
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
        },
      });
    });

    test('should build a request without @timestamp fallback if secondaryTimestamp is not specified', () => {
      const request = buildEqlSearchRequest({
        query: 'process where true',
        index: ['testindex1', 'testindex2'],
        from: 'now-5m',
        to: 'now',
        size: 100,
        filters: undefined,
        primaryTimestamp: 'event.ingested',
        secondaryTimestamp: undefined,
        runtimeMappings: undefined,
        eventCategoryOverride: 'event.other_category',
        timestampField: undefined,
        exceptionFilter: undefined,
      });
      expect(request).toEqual({
        allow_no_indices: true,
        index: ['testindex1', 'testindex2'],
        body: {
          event_category_field: 'event.other_category',
          size: 100,
          query: 'process where true',
          runtime_mappings: undefined,
          filter: {
            bool: {
              filter: [
                {
                  range: {
                    'event.ingested': {
                      lte: 'now',
                      gte: 'now-5m',
                      format: 'strict_date_optional_time',
                    },
                  },
                },
                emptyFilter,
              ],
            },
          },
          fields: [
            {
              field: '*',
              include_unmapped: true,
            },
            {
              field: 'event.ingested',
              format: 'strict_date_optional_time',
            },
          ],
        },
      });
    });

    test('should build a request with exceptions', async () => {
      const { filter } = await buildExceptionFilter({
        listClient: getListClientMock(),
        lists: [getExceptionListItemSchemaMock()],
        alias: null,
        chunkSize: 1024,
        excludeExceptions: true,
      });
      const request = buildEqlSearchRequest({
        query: 'process where true',
        index: ['testindex1', 'testindex2'],
        from: 'now-5m',
        to: 'now',
        size: 100,
        filters: undefined,
        primaryTimestamp: '@timestamp',
        secondaryTimestamp: undefined,
        runtimeMappings: undefined,
        eventCategoryOverride: undefined,
        exceptionFilter: filter,
      });
      expect(request).toMatchInlineSnapshot(`
        Object {
          "allow_no_indices": true,
          "body": Object {
            "event_category_field": undefined,
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
                        "gte": "now-5m",
                        "lte": "now",
                      },
                    },
                  },
                  Object {
                    "bool": Object {
                      "filter": Array [],
                      "must": Array [],
                      "must_not": Array [
                        Object {
                          "bool": Object {
                            "should": Array [
                              Object {
                                "bool": Object {
                                  "filter": Array [
                                    Object {
                                      "nested": Object {
                                        "path": "some.parentField",
                                        "query": Object {
                                          "bool": Object {
                                            "minimum_should_match": 1,
                                            "should": Array [
                                              Object {
                                                "match_phrase": Object {
                                                  "some.parentField.nested.field": "some value",
                                                },
                                              },
                                            ],
                                          },
                                        },
                                        "score_mode": "none",
                                      },
                                    },
                                    Object {
                                      "bool": Object {
                                        "minimum_should_match": 1,
                                        "should": Array [
                                          Object {
                                            "match_phrase": Object {
                                              "some.not.nested.field": "some value",
                                            },
                                          },
                                        ],
                                      },
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                      ],
                      "should": Array [],
                    },
                  },
                ],
              },
            },
            "query": "process where true",
            "runtime_mappings": undefined,
            "size": 100,
            "tiebreaker_field": undefined,
            "timestamp_field": undefined,
          },
          "index": Array [
            "testindex1",
            "testindex2",
          ],
        }
      `);
    });

    test('should build a request with filters', () => {
      const filters = [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'exists',
            key: 'process.name',
            value: 'exists',
          },
          query: {
            exists: {
              field: 'process.name',
            },
          },
        },
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'host.name',
            params: {
              query: 'Host-b4d9hu1a56',
            },
          },
          query: {
            match_phrase: {
              'host.name': 'Host-b4d9hu1a56',
            },
          },
        },
      ];
      const request = buildEqlSearchRequest({
        query: 'process where true',
        index: ['testindex1', 'testindex2'],
        from: 'now-5m',
        to: 'now',
        size: 100,
        filters,
        primaryTimestamp: '@timestamp',
        secondaryTimestamp: undefined,
        runtimeMappings: undefined,
        exceptionFilter: undefined,
      });
      expect(request).toEqual({
        allow_no_indices: true,
        index: ['testindex1', 'testindex2'],
        body: {
          size: 100,
          query: 'process where true',
          filter: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-5m',
                      lte: 'now',
                      format: 'strict_date_optional_time',
                    },
                  },
                },
                {
                  bool: {
                    must: [],
                    filter: [
                      {
                        exists: {
                          field: 'process.name',
                        },
                      },
                      {
                        match_phrase: {
                          'host.name': 'Host-b4d9hu1a56',
                        },
                      },
                    ],
                    should: [],
                    must_not: [],
                  },
                },
              ],
            },
          },
          fields: [
            {
              field: '*',
              include_unmapped: true,
            },
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
        },
      });
    });
  });
});
