/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
      searchAfterSortId: undefined,
      timestampOverride: undefined,
    });
    expect(query).toEqual({
      allowNoIndices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignoreUnavailable: true,
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
                              '@timestamp': {
                                gte: 'now-5m',
                              },
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              '@timestamp': {
                                lte: 'today',
                              },
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

        sort: [
          {
            '@timestamp': {
              order: 'asc',
            },
          },
        ],
      },
    });
  });
  test('if searchAfterSortId is an empty string it should not be included', () => {
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortId: '',
      timestampOverride: undefined,
    });
    expect(query).toEqual({
      allowNoIndices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignoreUnavailable: true,
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
                              '@timestamp': {
                                gte: 'now-5m',
                              },
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              '@timestamp': {
                                lte: 'today',
                              },
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

        sort: [
          {
            '@timestamp': {
              order: 'asc',
            },
          },
        ],
      },
    });
  });
  test('if searchAfterSortId is a valid sortId string', () => {
    const fakeSortId = '123456789012';
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortId: fakeSortId,
      timestampOverride: undefined,
    });
    expect(query).toEqual({
      allowNoIndices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignoreUnavailable: true,
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
                              '@timestamp': {
                                gte: 'now-5m',
                              },
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              '@timestamp': {
                                lte: 'today',
                              },
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

        sort: [
          {
            '@timestamp': {
              order: 'asc',
            },
          },
        ],
        search_after: [fakeSortId],
      },
    });
  });
  test('if searchAfterSortId is a valid sortId number', () => {
    const fakeSortIdNumber = 123456789012;
    const query = buildEventsSearchQuery({
      index: ['auditbeat-*'],
      from: 'now-5m',
      to: 'today',
      filter: {},
      size: 100,
      searchAfterSortId: fakeSortIdNumber,
      timestampOverride: undefined,
    });
    expect(query).toEqual({
      allowNoIndices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignoreUnavailable: true,
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
                              '@timestamp': {
                                gte: 'now-5m',
                              },
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              '@timestamp': {
                                lte: 'today',
                              },
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

        sort: [
          {
            '@timestamp': {
              order: 'asc',
            },
          },
        ],
        search_after: [fakeSortIdNumber],
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
      searchAfterSortId: undefined,
      timestampOverride: undefined,
    });
    expect(query).toEqual({
      allowNoIndices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignoreUnavailable: true,
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
                              '@timestamp': {
                                gte: 'now-5m',
                              },
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              '@timestamp': {
                                lte: 'today',
                              },
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

        sort: [
          {
            '@timestamp': {
              order: 'asc',
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
      searchAfterSortId: undefined,
      timestampOverride: undefined,
    });
    expect(query).toEqual({
      allowNoIndices: true,
      index: ['auditbeat-*'],
      size: 100,
      ignoreUnavailable: true,
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
                              '@timestamp': {
                                gte: 'now-5m',
                              },
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            range: {
                              '@timestamp': {
                                lte: 'today',
                              },
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
            },
          },
        ],
      },
    });
  });
});
