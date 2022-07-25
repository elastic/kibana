/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';

import type { AiopsExplainLogRateSpikesSchema } from '../../../common/api/explain_log_rate_spikes';

import { fetchFieldCandidates, getRandomDocsRequest } from './fetch_field_candidates';

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

describe('query_field_candidates', () => {
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
          myIpFieldName: { ip: {} },
          myKeywordFieldName: { keyword: {} },
          myUnpopulatedKeywordFieldName: { keyword: {} },
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
          },
        } as unknown as estypes.SearchResponse;
      });

      const esClientMock = {
        fieldCaps: esClientFieldCapsMock,
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const resp = await fetchFieldCandidates(esClientMock, params);

      expect(resp).toEqual(['myIpFieldName', 'myKeywordFieldName']);
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
