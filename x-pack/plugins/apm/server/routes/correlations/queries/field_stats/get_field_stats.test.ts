/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { getNumericFieldStatsRequest } from './get_numeric_field_stats';
import { getKeywordFieldStatsRequest } from './get_keyword_field_stats';
import { getBooleanFieldStatsRequest } from './get_boolean_field_stats';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient } from '@kbn/core/server';
import { fetchFieldsStats } from './get_fields_stats';

const params = {
  index: 'apm-*',
  start: 1577836800000,
  end: 1609459200000,
  includeFrozen: false,
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};

export const getExpectedQuery = (aggs: any) => {
  return {
    body: {
      aggs,
      query: {
        bool: {
          filter: [
            { term: { 'processor.event': 'transaction' } },
            {
              range: {
                '@timestamp': {
                  format: 'epoch_millis',
                  gte: 1577836800000,
                  lte: 1609459200000,
                },
              },
            },
          ],
        },
      },
    },
    index: 'apm-*',
    size: 0,
    track_total_hits: false,
  };
};

describe('field_stats', () => {
  describe('getNumericFieldStatsRequest', () => {
    it('returns request with filter, percentiles, and top terms aggregations ', () => {
      const req = getNumericFieldStatsRequest(params, 'url.path');

      const expectedAggs = {
        sampled_field_stats: {
          aggs: { actual_stats: { stats: { field: 'url.path' } } },
          filter: { exists: { field: 'url.path' } },
        },
        sampled_top: {
          terms: {
            field: 'url.path',
            order: { _count: 'desc' },
            size: 10,
          },
        },
      };
      expect(req).toEqual(getExpectedQuery(expectedAggs));
    });
  });
  describe('getKeywordFieldStatsRequest', () => {
    it('returns request with top terms sampler aggregation ', () => {
      const req = getKeywordFieldStatsRequest(params, 'url.path');

      const expectedAggs = {
        sampled_top: {
          terms: { field: 'url.path', size: 10 },
        },
      };
      expect(req).toEqual(getExpectedQuery(expectedAggs));
    });
  });
  describe('getBooleanFieldStatsRequest', () => {
    it('returns request with top terms sampler aggregation ', () => {
      const req = getBooleanFieldStatsRequest(params, 'url.path');

      const expectedAggs = {
        sampled_value_count: {
          filter: { exists: { field: 'url.path' } },
        },
        sampled_values: { terms: { field: 'url.path', size: 2 } },
      };
      expect(req).toEqual(getExpectedQuery(expectedAggs));
    });
  });

  describe('fetchFieldsStats', () => {
    it('returns field candidates and total hits', async () => {
      const fieldsCaps = {
        fields: {
          myIpFieldName: { ip: {} },
          myKeywordFieldName: { keyword: {} },
          myMultiFieldName: { keyword: {}, text: {} },
          myHistogramFieldName: { histogram: {} },
          myNumericFieldName: { number: {} },
        },
      };
      const esClientFieldCapsMock = jest.fn(() => fieldsCaps);

      const fieldsToSample = Object.keys(fieldsCaps.fields);

      const esClientSearchMock = jest.fn(
        (req: estypes.SearchRequest): estypes.SearchResponse => {
          return {
            aggregations: { sample: {} },
          } as unknown as estypes.SearchResponse;
        }
      );

      const esClientMock = {
        fieldCaps: esClientFieldCapsMock,
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const resp = await fetchFieldsStats(esClientMock, params, fieldsToSample);
      // Should not return stats for unsupported field types like histogram
      const expectedFields = [
        'myIpFieldName',
        'myKeywordFieldName',
        'myMultiFieldName',
        'myNumericFieldName',
      ];
      expect(resp.stats.map((s) => s.fieldName)).toEqual(expectedFields);
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(4);
    });
  });
});
