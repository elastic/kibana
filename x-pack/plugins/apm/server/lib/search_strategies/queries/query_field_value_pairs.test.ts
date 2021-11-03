/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

import { searchServiceLogProvider } from '../search_service_log';
import { latencyCorrelationsSearchServiceStateProvider } from '../latency_correlations/latency_correlations_search_service_state';

import {
  fetchTransactionDurationFieldValuePairs,
  getTermsAggRequest,
} from './query_field_value_pairs';

const params = {
  index: 'apm-*',
  start: 1577836800000,
  end: 1609459200000,
  includeFrozen: false,
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};

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

      const esClientSearchMock = jest.fn(
        (
          req: estypes.SearchRequest
        ): {
          body: estypes.SearchResponse;
        } => {
          return {
            body: {
              aggregations: {
                attribute_terms: {
                  buckets: [{ key: 'myValue1' }, { key: 'myValue2' }],
                },
              },
            } as unknown as estypes.SearchResponse,
          };
        }
      );

      const esClientMock = {
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const { addLogMessage, getLogMessages } = searchServiceLogProvider();
      const state = latencyCorrelationsSearchServiceStateProvider();

      const resp = await fetchTransactionDurationFieldValuePairs(
        esClientMock,
        params,
        fieldCandidates,
        state,
        addLogMessage
      );

      const { progress } = state.getState();

      expect(progress.loadedFieldValuePairs).toBe(1);
      expect(resp).toEqual([
        { fieldName: 'myFieldCandidate1', fieldValue: 'myValue1' },
        { fieldName: 'myFieldCandidate1', fieldValue: 'myValue2' },
        { fieldName: 'myFieldCandidate2', fieldValue: 'myValue1' },
        { fieldName: 'myFieldCandidate2', fieldValue: 'myValue2' },
        { fieldName: 'myFieldCandidate3', fieldValue: 'myValue1' },
        { fieldName: 'myFieldCandidate3', fieldValue: 'myValue2' },
      ]);
      expect(esClientSearchMock).toHaveBeenCalledTimes(3);
      expect(getLogMessages()).toEqual([]);
    });
  });
});
