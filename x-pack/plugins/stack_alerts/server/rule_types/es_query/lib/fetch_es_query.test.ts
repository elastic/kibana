/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnlyEsQueryRuleParams } from '../types';
import { Comparator } from '../../../../common/comparator_types';
import { fetchEsQuery } from './fetch_es_query';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

jest.mock('@kbn/triggers-actions-ui-plugin/common', () => {
  const actual = jest.requireActual('@kbn/triggers-actions-ui-plugin/common');
  return {
    ...actual,
    parseAggregationResults: jest.fn(),
  };
});

const mockNow = jest.getRealSystemTime();
const defaultParams: OnlyEsQueryRuleParams = {
  index: ['test-index'],
  size: 100,
  timeField: '@timestamp',
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  thresholdComparator: Comparator.LT,
  threshold: [0],
  searchType: 'esQuery',
  excludeHitsFromPreviousRun: true,
  aggType: 'count',
  groupBy: 'all',
  esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
};

const logger = loggerMock.create();
const scopedClusterClientMock = elasticsearchServiceMock.createScopedClusterClient();

describe('fetchEsQuery', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  const services = {
    scopedClusterClient: scopedClusterClientMock,
    logger,
  };
  it('should add time filter if timestamp if defined and excludeHitsFromPreviousRun is true', async () => {
    const params = defaultParams;
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: '2020-02-09T23:15:41.941Z',
      services,
      spacePrefix: '',
      publicBaseUrl: '',
      dateStart: date,
      dateEnd: date,
    });
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {},
          docvalue_fields: [
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    filter: [
                      {
                        match_all: {},
                      },
                      {
                        bool: {
                          must_not: [
                            {
                              bool: {
                                filter: [
                                  {
                                    range: {
                                      '@timestamp': {
                                        format: 'strict_date_optional_time',
                                        lte: '2020-02-09T23:15:41.941Z',
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
                {
                  bool: {
                    filter: [
                      {
                        range: {
                          '@timestamp': {
                            format: 'strict_date_optional_time',
                            gte: date,
                            lte: date,
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          sort: [
            {
              '@timestamp': {
                format: 'strict_date_optional_time||epoch_millis',
                order: 'desc',
              },
            },
          ],
        },
        ignore_unavailable: true,
        index: ['test-index'],
        size: 100,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should not add time filter if timestamp is undefined', async () => {
    const params = defaultParams;
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: undefined,
      services,
      spacePrefix: '',
      publicBaseUrl: '',
      dateStart: date,
      dateEnd: date,
    });
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {},
          docvalue_fields: [
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
          query: {
            bool: {
              filter: [
                {
                  match_all: {},
                },
                {
                  bool: {
                    filter: [
                      {
                        range: {
                          '@timestamp': {
                            format: 'strict_date_optional_time',
                            gte: date,
                            lte: date,
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          sort: [
            {
              '@timestamp': {
                format: 'strict_date_optional_time||epoch_millis',
                order: 'desc',
              },
            },
          ],
        },
        ignore_unavailable: true,
        index: ['test-index'],
        size: 100,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should not add time filter if excludeHitsFromPreviousRun is false', async () => {
    const params = { ...defaultParams, excludeHitsFromPreviousRun: false };
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: '2020-02-09T23:15:41.941Z',
      services,
      spacePrefix: '',
      publicBaseUrl: '',
      dateStart: date,
      dateEnd: date,
    });
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {},
          docvalue_fields: [
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
          query: {
            bool: {
              filter: [
                {
                  match_all: {},
                },
                {
                  bool: {
                    filter: [
                      {
                        range: {
                          '@timestamp': {
                            format: 'strict_date_optional_time',
                            gte: date,
                            lte: date,
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          sort: [
            {
              '@timestamp': {
                format: 'strict_date_optional_time||epoch_millis',
                order: 'desc',
              },
            },
          ],
        },
        ignore_unavailable: true,
        index: ['test-index'],
        size: 100,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should set size: 0 and top hits size to size parameter if grouping alerts', async () => {
    const params = { ...defaultParams, groupBy: 'top', termField: 'host.name', termSize: 10 };
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: undefined,
      services,
      spacePrefix: '',
      publicBaseUrl: '',
      dateStart: date,
      dateEnd: date,
    });
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            groupAgg: {
              aggs: {
                conditionSelector: {
                  bucket_selector: {
                    buckets_path: {
                      compareValue: '_count',
                    },
                    script: 'params.compareValue < 0L',
                  },
                },
                topHitsAgg: {
                  top_hits: {
                    size: 100,
                  },
                },
              },
              terms: {
                field: 'host.name',
                size: 10,
              },
            },
            groupAggCount: {
              stats_bucket: {
                buckets_path: 'groupAgg._count',
              },
            },
          },
          docvalue_fields: [
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
          query: {
            bool: {
              filter: [
                {
                  match_all: {},
                },
                {
                  bool: {
                    filter: [
                      {
                        range: {
                          '@timestamp': {
                            format: 'strict_date_optional_time',
                            gte: date,
                            lte: date,
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          sort: [
            {
              '@timestamp': {
                format: 'strict_date_optional_time||epoch_millis',
                order: 'desc',
              },
            },
          ],
        },
        ignore_unavailable: true,
        index: ['test-index'],
        size: 0,
        track_total_hits: true,
      },
      { meta: true }
    );
  });

  it('should log if group by and top hits size is too large', async () => {
    const params = {
      ...defaultParams,
      groupBy: 'top',
      termField: 'host.name',
      termSize: 10,
      size: 200,
    };
    const date = new Date().toISOString();

    await fetchEsQuery({
      ruleId: 'abc',
      name: 'test-rule',
      params,
      timestamp: undefined,
      services,
      spacePrefix: '',
      publicBaseUrl: '',
      dateStart: date,
      dateEnd: date,
    });
    expect(logger.warn).toHaveBeenCalledWith(`Top hits size is capped at 100`);
    expect(scopedClusterClientMock.asCurrentUser.search).toHaveBeenCalledWith(
      {
        allow_no_indices: true,
        body: {
          aggs: {
            groupAgg: {
              aggs: {
                conditionSelector: {
                  bucket_selector: {
                    buckets_path: {
                      compareValue: '_count',
                    },
                    script: 'params.compareValue < 0L',
                  },
                },
                topHitsAgg: {
                  top_hits: {
                    size: 100,
                  },
                },
              },
              terms: {
                field: 'host.name',
                size: 10,
              },
            },
            groupAggCount: {
              stats_bucket: {
                buckets_path: 'groupAgg._count',
              },
            },
          },
          docvalue_fields: [
            {
              field: '@timestamp',
              format: 'strict_date_optional_time',
            },
          ],
          query: {
            bool: {
              filter: [
                {
                  match_all: {},
                },
                {
                  bool: {
                    filter: [
                      {
                        range: {
                          '@timestamp': {
                            format: 'strict_date_optional_time',
                            gte: date,
                            lte: date,
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          sort: [
            {
              '@timestamp': {
                format: 'strict_date_optional_time||epoch_millis',
                order: 'desc',
              },
            },
          ],
        },
        ignore_unavailable: true,
        index: ['test-index'],
        size: 0,
        track_total_hits: true,
      },
      { meta: true }
    );
  });
});
