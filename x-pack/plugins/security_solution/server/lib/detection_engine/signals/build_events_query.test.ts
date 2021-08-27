/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEventsSearchQuery } from './build_events_query';

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
                bool: {
                  filter: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
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
                  ],
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
                  filter: [
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
                bool: {
                  filter: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
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
                  ],
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
                bool: {
                  filter: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
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
                  ],
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
                bool: {
                  filter: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
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
                  ],
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
                bool: {
                  filter: [
                    {
                      bool: {
                        minimum_should_match: 1,
                        should: [
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
                  ],
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
});
