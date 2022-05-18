/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import {
  findValueInBuckets,
  getAggregationsBuckets,
  getBucketFromAggregation,
  getConnectorsCardinalityAggregationQuery,
  getCountsAggregationQuery,
  getCountsAndMaxData,
  getCountsFromBuckets,
  getMaxBucketOnCaseAggregationQuery,
  getOnlyAlertsCommentsFilter,
  getOnlyConnectorsFilter,
  getReferencesAggregationQuery,
} from './utils';

describe('utils', () => {
  describe('getCountsAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getCountsAggregationQuery('test')).toEqual({
        counts: {
          date_range: {
            field: 'test.attributes.created_at',
            format: 'dd/MM/YYYY',
            ranges: [
              { from: 'now-1d', to: 'now' },
              { from: 'now-1w', to: 'now' },
              { from: 'now-1M', to: 'now' },
            ],
          },
        },
      });
    });
  });

  describe('getMaxBucketOnCaseAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getMaxBucketOnCaseAggregationQuery('test')).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            cases: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                ids: {
                  terms: {
                    field: 'test.references.id',
                  },
                },
                max: {
                  max_bucket: {
                    buckets_path: 'ids._count',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getReferencesAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(
        getReferencesAggregationQuery({ savedObjectType: 'test', referenceType: 'cases' })
      ).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                referenceAgg: {
                  terms: {
                    field: 'test.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });

    it('returns the correct query when changing the agg', () => {
      expect(
        getReferencesAggregationQuery({
          savedObjectType: 'test',
          referenceType: 'cases',
          agg: 'cardinality',
        })
      ).toEqual({
        references: {
          nested: {
            path: 'test.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'test.references.type': 'cases',
                },
              },
              aggregations: {
                referenceAgg: {
                  cardinality: {
                    field: 'test.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getConnectorsCardinalityAggregationQuery', () => {
    it('returns the correct query', () => {
      expect(getConnectorsCardinalityAggregationQuery()).toEqual({
        references: {
          nested: {
            path: 'cases-user-actions.references',
          },
          aggregations: {
            referenceType: {
              filter: {
                term: {
                  'cases-user-actions.references.type': 'action',
                },
              },
              aggregations: {
                referenceAgg: {
                  cardinality: {
                    field: 'cases-user-actions.references.id',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('getCountsFromBuckets', () => {
    it('returns the correct counts', () => {
      const buckets = [
        { doc_count: 1, key: 1 },
        { doc_count: 2, key: 2 },
        { doc_count: 3, key: 3 },
      ];

      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 3,
        weekly: 2,
        monthly: 1,
      });
    });

    it('returns zero counts when the bucket do not have the doc_count field', () => {
      const buckets = [{}];
      // @ts-expect-error
      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    });

    it('returns zero counts when the bucket is undefined', () => {
      // @ts-expect-error
      expect(getCountsFromBuckets(undefined)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 0,
      });
    });

    it('returns zero counts when the doc_count field is missing in some buckets', () => {
      const buckets = [{ doc_count: 1, key: 1 }, {}, {}];
      // @ts-expect-error
      expect(getCountsFromBuckets(buckets)).toEqual({
        daily: 0,
        weekly: 0,
        monthly: 1,
      });
    });
  });

  describe('getCountsAndMaxData', () => {
    const savedObjectsClient = savedObjectsRepositoryMock.create();
    savedObjectsClient.find.mockResolvedValue({
      total: 5,
      saved_objects: [],
      per_page: 1,
      page: 1,
      aggregations: {
        counts: {
          buckets: [
            { doc_count: 1, key: 1 },
            { doc_count: 2, key: 2 },
            { doc_count: 3, key: 3 },
          ],
        },
        references: { cases: { max: { value: 1 } } },
      },
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns the correct counts and max data', async () => {
      const res = await getCountsAndMaxData({ savedObjectsClient, savedObjectType: 'test' });
      expect(res).toEqual({
        all: {
          total: 5,
          daily: 3,
          weekly: 2,
          monthly: 1,
          maxOnACase: 1,
        },
      });
    });

    it('returns zero data if the response aggregation is not as expected', async () => {
      savedObjectsClient.find.mockResolvedValue({
        total: 5,
        saved_objects: [],
        per_page: 1,
        page: 1,
      });

      const res = await getCountsAndMaxData({ savedObjectsClient, savedObjectType: 'test' });
      expect(res).toEqual({
        all: {
          total: 5,
          daily: 0,
          weekly: 0,
          monthly: 0,
          maxOnACase: 0,
        },
      });
    });

    it('should call find with correct arguments', async () => {
      await getCountsAndMaxData({ savedObjectsClient, savedObjectType: 'test' });
      expect(savedObjectsClient.find).toBeCalledWith({
        aggs: {
          counts: {
            date_range: {
              field: 'test.attributes.created_at',
              format: 'dd/MM/YYYY',
              ranges: [
                {
                  from: 'now-1d',
                  to: 'now',
                },
                {
                  from: 'now-1w',
                  to: 'now',
                },
                {
                  from: 'now-1M',
                  to: 'now',
                },
              ],
            },
          },
          references: {
            aggregations: {
              cases: {
                aggregations: {
                  ids: {
                    terms: {
                      field: 'test.references.id',
                    },
                  },
                  max: {
                    max_bucket: {
                      buckets_path: 'ids._count',
                    },
                  },
                },
                filter: {
                  term: {
                    'test.references.type': 'cases',
                  },
                },
              },
            },
            nested: {
              path: 'test.references',
            },
          },
        },
        filter: undefined,
        page: 0,
        perPage: 0,
        type: 'test',
      });
    });
  });

  describe('getBucketFromAggregation', () => {
    it('returns the buckets', () => {
      expect(
        getBucketFromAggregation({
          aggs: { test: { deep: { buckets: [{ doc_count: 1, key: 1 }] } } },
          key: 'test.deep',
        })
      ).toEqual([{ doc_count: 1, key: 1 }]);
    });

    it('returns an empty array if the path does not exist', () => {
      expect(
        getBucketFromAggregation({
          key: 'test.deep',
        })
      ).toEqual([]);
    });
  });

  describe('findValueInBuckets', () => {
    it('find the value in the bucket', () => {
      const buckets = [
        { doc_count: 1, key: 'test' },
        { doc_count: 2, key: 'not' },
      ];
      expect(findValueInBuckets(buckets, 'test')).toBe(1);
    });

    it('return zero if the value is not found', () => {
      const buckets = [{ doc_count: 1, key: 'test' }];
      expect(findValueInBuckets(buckets, 'not-in-the-bucket')).toBe(0);
    });
  });

  describe('getAggregationsBuckets', () => {
    it('return aggregation buckets', () => {
      const buckets = [
        { doc_count: 1, key: 'test' },
        { doc_count: 2, key: 'not' },
      ];

      const aggs = {
        foo: { baz: { buckets } },
        bar: { buckets },
      };

      expect(getAggregationsBuckets({ aggs, keys: ['foo.baz', 'bar'] })).toEqual({
        'foo.baz': buckets,
        bar: buckets,
      });
    });
  });

  describe('getOnlyAlertsCommentsFilter', () => {
    it('return the correct filter', () => {
      expect(getOnlyAlertsCommentsFilter()).toEqual({
        arguments: [
          {
            type: 'literal',
            value: 'cases-comments.attributes.type',
          },
          {
            type: 'literal',
            value: 'alert',
          },
          {
            type: 'literal',
            value: false,
          },
        ],
        function: 'is',
        type: 'function',
      });
    });
  });

  describe('getOnlyConnectorsFilter', () => {
    it('return the correct filter', () => {
      expect(getOnlyConnectorsFilter()).toEqual({
        arguments: [
          {
            type: 'literal',
            value: 'cases-user-actions.attributes.type',
          },
          {
            type: 'literal',
            value: 'connector',
          },
          {
            type: 'literal',
            value: false,
          },
        ],
        function: 'is',
        type: 'function',
      });
    });
  });
});
