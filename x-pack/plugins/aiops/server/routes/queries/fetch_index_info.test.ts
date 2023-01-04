/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';

import type { AiopsExplainLogRateSpikesSchema } from '../../../common/api/explain_log_rate_spikes';

import { fetchIndexInfo, getRandomDocsRequest } from './fetch_index_info';

const params: AiopsExplainLogRateSpikesSchema = {
  index: 'the-index',
  timeFieldName: 'the-time-field-name',
  start: 1577836800000,
  end: 1609459200000,
  baselineMin: 10,
  baselineMax: 20,
  deviationMin: 30,
  deviationMax: 40,
  includeFrozen: false,
  searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
};

describe('fetch_index_info', () => {
  describe('getRandomDocsRequest', () => {
    it('returns the most basic request body for a sample of random documents', () => {
      const req = getRandomDocsRequest(params);

      expect(req).toEqual({
        body: {
          _source: false,
          fields: ['*'],
          query: {
            function_score: {
              query: {
                bool: {
                  filter: [
                    { bool: { filter: [], must: [{ match_all: {} }], must_not: [] } },
                    {
                      range: {
                        'the-time-field-name': {
                          format: 'epoch_millis',
                          gte: 1577836800000,
                          lte: 1609459200000,
                        },
                      },
                    },
                  ],
                },
              },
              random_score: {},
            },
          },
          size: 1000,
          track_total_hits: true,
        },
        index: params.index,
        ignore_throttled: undefined,
        ignore_unavailable: true,
      });
    });
  });

  describe('fetchFieldCandidates', () => {
    it('returns field candidates and total hits', async () => {
      const esClientFieldCapsMock = jest.fn(() => ({
        fields: {
          // Should end up as a field candidate
          myIpFieldName: { ip: { aggregatable: true } },
          // Should end up as a field candidate
          myKeywordFieldName: { keyword: { aggregatable: true } },
          // Should not end up as a field candidate, it's a keyword but non-aggregatable
          myKeywordFieldNameToBeIgnored: { keyword: { aggregatable: false } },
          // Should not end up as a field candidate, based on this field caps result it would be
          // but it will not be part of the mocked search result so will count as unpopulated.
          myUnpopulatedKeywordFieldName: { keyword: { aggregatable: true } },
          // Should not end up as a field candidate since fields of type number will not be considered
          myNumericFieldName: { number: {} },
        },
      }));
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
        return {
          hits: {
            hits: [
              {
                fields: {
                  myIpFieldName: '1.1.1.1',
                  myKeywordFieldName: 'myKeywordFieldValue',
                  myNumericFieldName: 1234,
                },
              },
            ],
            total: { value: 5000000 },
          },
        } as unknown as estypes.SearchResponse;
      });

      const esClientMock = {
        fieldCaps: esClientFieldCapsMock,
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const { totalDocCount, sampleProbability, fieldCandidates } = await fetchIndexInfo(
        esClientMock,
        params
      );

      expect(fieldCandidates).toEqual(['myIpFieldName', 'myKeywordFieldName']);
      expect(sampleProbability).toEqual(0.01);
      expect(totalDocCount).toEqual(5000000);
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
