/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getEventCount } from './get_event_count';

describe('getEventCount', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('can respect tuple', async () => {
    await getEventCount({
      esClient,
      query: '*:*',
      language: 'kuery',
      filters: [],
      index: ['test-index'],
      tuple: { to: moment('2022-01-14'), from: moment('2022-01-13'), maxSignals: 1337 },
      primaryTimestamp: '@timestamp',
      exceptionFilter: undefined,
    });

    expect(esClient.count).toHaveBeenCalledWith({
      body: {
        query: {
          bool: {
            filter: [
              { bool: { must: [], filter: [], should: [], must_not: [] } },
              {
                range: {
                  '@timestamp': {
                    lte: '2022-01-14T05:00:00.000Z',
                    gte: '2022-01-13T05:00:00.000Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
      },
      ignore_unavailable: true,
      index: ['test-index'],
    });
  });

  it('can override timestamp', async () => {
    await getEventCount({
      esClient,
      query: '*:*',
      language: 'kuery',
      filters: [],
      index: ['test-index'],
      tuple: { to: moment('2022-01-14'), from: moment('2022-01-13'), maxSignals: 1337 },
      primaryTimestamp: 'event.ingested',
      secondaryTimestamp: '@timestamp',
      exceptionFilter: undefined,
    });

    expect(esClient.count).toHaveBeenCalledWith({
      body: {
        query: {
          bool: {
            filter: [
              { bool: { must: [], filter: [], should: [], must_not: [] } },
              {
                bool: {
                  should: [
                    {
                      range: {
                        'event.ingested': {
                          lte: '2022-01-14T05:00:00.000Z',
                          gte: '2022-01-13T05:00:00.000Z',
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
                                lte: '2022-01-14T05:00:00.000Z',
                                gte: '2022-01-13T05:00:00.000Z',
                                format: 'strict_date_optional_time',
                              },
                            },
                          },
                          { bool: { must_not: { exists: { field: 'event.ingested' } } } },
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
      },
      ignore_unavailable: true,
      index: ['test-index'],
    });
  });

  it('can override timestamp without fallback to @timestamp', async () => {
    await getEventCount({
      esClient,
      query: '*:*',
      language: 'kuery',
      filters: [],
      index: ['test-index'],
      tuple: { to: moment('2022-01-14'), from: moment('2022-01-13'), maxSignals: 1337 },
      primaryTimestamp: 'event.ingested',
      exceptionFilter: undefined,
    });

    expect(esClient.count).toHaveBeenCalledWith({
      body: {
        query: {
          bool: {
            filter: [
              { bool: { must: [], filter: [], should: [], must_not: [] } },
              {
                range: {
                  'event.ingested': {
                    lte: '2022-01-14T05:00:00.000Z',
                    gte: '2022-01-13T05:00:00.000Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
          },
        },
      },
      ignore_unavailable: true,
      index: ['test-index'],
    });
  });
});
