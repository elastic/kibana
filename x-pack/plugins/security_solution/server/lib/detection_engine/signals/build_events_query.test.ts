/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEqlSearchRequest, buildEventsSearchQuery } from './build_events_query';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';

describe('create_signals', () => {
  test('it builds a now-5m up to today filter', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: undefined,
      timestampOverride: undefined,
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
              {
                match_all: {},
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
      timestampOverride: 'event.ingested',
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
              {
                match_all: {},
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

  test('if searchAfterSortIds is a valid sortId string', () => {
    const fakeSortId = '123456789012';
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortIds: [fakeSortId],
      timestampOverride: undefined,
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
              {
                match_all: {},
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
      timestampOverride: undefined,
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
              {
                match_all: {},
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
      timestampOverride: undefined,
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
              {
                match_all: {},
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
      timestampOverride: undefined,
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
              {
                match_all: {},
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
      timestampOverride: undefined,
      trackTotalHits: false,
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
      timestampOverride: undefined,
      sortOrder: 'desc',
      trackTotalHits: false,
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
      timestampOverride: 'event.ingested',
      sortOrder: 'desc',
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

  describe('buildEqlSearchRequest', () => {
    test('should build a basic request with time range', () => {
      const request = buildEqlSearchRequest(
        'process where true',
        ['testindex1', 'testindex2'],
        'now-5m',
        'now',
        100,
        undefined,
        [],
        undefined
      );
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
      const request = buildEqlSearchRequest(
        'process where true',
        ['testindex1', 'testindex2'],
        'now-5m',
        'now',
        100,
        'event.ingested',
        [],
        'event.other_category'
      );
      expect(request).toEqual({
        allow_no_indices: true,
        index: ['testindex1', 'testindex2'],
        body: {
          event_category_field: 'event.other_category',
          size: 100,
          query: 'process where true',
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

    test('should build a request with exceptions', () => {
      const request = buildEqlSearchRequest(
        'process where true',
        ['testindex1', 'testindex2'],
        'now-5m',
        'now',
        100,
        undefined,
        [getExceptionListItemSchemaMock()],
        undefined
      );
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
                    must_not: {
                      bool: {
                        should: [
                          {
                            bool: {
                              filter: [
                                {
                                  nested: {
                                    path: 'some.parentField',
                                    query: {
                                      bool: {
                                        minimum_should_match: 1,
                                        should: [
                                          {
                                            match_phrase: {
                                              'some.parentField.nested.field': 'some value',
                                            },
                                          },
                                        ],
                                      },
                                    },
                                    score_mode: 'none',
                                  },
                                },
                                {
                                  bool: {
                                    minimum_should_match: 1,
                                    should: [
                                      {
                                        match_phrase: {
                                          'some.not.nested.field': 'some value',
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
