/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from 'src/core/server';

import { asyncSearchServiceLogProvider } from '../async_search_service_log';
import { asyncSearchServiceStateProvider } from '../async_search_service_state';

import { fetchTransactionDurationHistograms } from './query_histograms_generator';

const params = {
  index: 'apm-*',
  start: '2020',
  end: '2021',
  includeFrozen: false,
};
const expectations = [1, 3, 5];
const ranges = [{ to: 1 }, { from: 1, to: 3 }, { from: 3, to: 5 }, { from: 5 }];
const fractions = [1, 2, 4, 5];
const totalDocCount = 1234;
const histogramRangeSteps = [1, 2, 4, 5];

const fieldValuePairs = [
  { field: 'the-field-name-1', value: 'the-field-value-1' },
  { field: 'the-field-name-2', value: 'the-field-value-2' },
  { field: 'the-field-name-2', value: 'the-field-value-3' },
];

describe('query_histograms_generator', () => {
  describe('fetchTransactionDurationHistograms', () => {
    it(`doesn't break on failing ES queries and adds messages to the log`, async () => {
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): {
        body: estypes.SearchResponse;
      } => {
        return {
          body: ({} as unknown) as estypes.SearchResponse,
        };
      });

      const esClientMock = ({
        search: esClientSearchMock,
      } as unknown) as ElasticsearchClient;

      const state = asyncSearchServiceStateProvider();
      const { addLogMessage, getLogMessages } = asyncSearchServiceLogProvider();

      let loadedHistograms = 0;
      const items = [];

      for await (const item of fetchTransactionDurationHistograms(
        esClientMock,
        addLogMessage,
        params,
        state,
        expectations,
        ranges,
        fractions,
        histogramRangeSteps,
        totalDocCount,
        fieldValuePairs
      )) {
        if (item !== undefined) {
          items.push(item);
        }
        loadedHistograms++;
      }

      expect(items.length).toEqual(0);
      expect(loadedHistograms).toEqual(3);
      expect(esClientSearchMock).toHaveBeenCalledTimes(3);
      expect(getLogMessages().map((d) => d.split(': ')[1])).toEqual([
        "Failed to fetch correlation/kstest for 'the-field-name-1/the-field-value-1'",
        "Failed to fetch correlation/kstest for 'the-field-name-2/the-field-value-2'",
        "Failed to fetch correlation/kstest for 'the-field-name-2/the-field-value-3'",
      ]);
    });

    it('returns items with correlation and ks-test value', async () => {
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): {
        body: estypes.SearchResponse;
      } => {
        return {
          body: ({
            aggregations: {
              latency_ranges: { buckets: [] },
              transaction_duration_correlation: { value: 0.6 },
              ks_test: { less: 0.001 },
              logspace_ranges: { buckets: [] },
            },
          } as unknown) as estypes.SearchResponse,
        };
      });

      const esClientMock = ({
        search: esClientSearchMock,
      } as unknown) as ElasticsearchClient;

      const state = asyncSearchServiceStateProvider();
      const { addLogMessage, getLogMessages } = asyncSearchServiceLogProvider();

      let loadedHistograms = 0;
      const items = [];

      for await (const item of fetchTransactionDurationHistograms(
        esClientMock,
        addLogMessage,
        params,
        state,
        expectations,
        ranges,
        fractions,
        histogramRangeSteps,
        totalDocCount,
        fieldValuePairs
      )) {
        if (item !== undefined) {
          items.push(item);
        }
        loadedHistograms++;
      }

      expect(items.length).toEqual(3);
      expect(loadedHistograms).toEqual(3);
      expect(esClientSearchMock).toHaveBeenCalledTimes(6);
      expect(getLogMessages().length).toEqual(0);
    });
  });
});
