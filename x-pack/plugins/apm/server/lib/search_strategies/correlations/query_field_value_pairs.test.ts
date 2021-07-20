/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import type { AsyncSearchProviderProgress } from '../../../../common/search_strategies/correlations/types';

import {
  fetchTransactionDurationFieldValuePairs,
  getTermsAggRequest,
} from './query_field_value_pairs';

const params = { index: 'apm-*', start: '2020', end: '2021' };

describe('query_field_value_pairs', () => {
  describe('getTermsAggRequest', () => {
    it('returns the most basic request body for a terms aggregation', () => {
      const fieldName = 'myFieldName';
      const req = getTermsAggRequest(params, fieldName);
      expect(req?.body?.aggs?.attribute_terms?.terms?.field).toBe(fieldName);
    });
  });

  describe('fetchTransactionDurationFieldValuePairs', () => {
    it('returns field/value pairs for field candidates', async () => {
      const fieldCandidates = [
        'myFieldCandidate1',
        'myFieldCandidate2',
        'myFieldCandidate3',
      ];
      const progress = {
        loadedFieldValuePairs: 0,
      } as AsyncSearchProviderProgress;

      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): {
        body: estypes.SearchResponse;
      } => {
        return {
          body: ({
            aggregations: {
              attribute_terms: {
                buckets: [{ key: 'myValue1' }, { key: 'myValue2' }],
              },
            },
          } as unknown) as estypes.SearchResponse,
        };
      });

      const esClientMock = ({
        search: esClientSearchMock,
      } as unknown) as ElasticsearchClient;

      const resp = await fetchTransactionDurationFieldValuePairs(
        esClientMock,
        params,
        fieldCandidates,
        progress
      );

      expect(progress.loadedFieldValuePairs).toBe(1);
      expect(resp).toEqual([
        { field: 'myFieldCandidate1', value: 'myValue1' },
        { field: 'myFieldCandidate1', value: 'myValue2' },
        { field: 'myFieldCandidate2', value: 'myValue1' },
        { field: 'myFieldCandidate2', value: 'myValue2' },
        { field: 'myFieldCandidate3', value: 'myValue1' },
        { field: 'myFieldCandidate3', value: 'myValue2' },
      ]);
      expect(esClientSearchMock).toHaveBeenCalledTimes(3);
    });
  });
});
