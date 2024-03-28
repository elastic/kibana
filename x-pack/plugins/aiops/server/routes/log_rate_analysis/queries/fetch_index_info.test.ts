/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';

import { paramsSearchQueryMock } from './__mocks__/params_search_query';

import { fetchIndexInfo } from './fetch_index_info';

describe('fetch_index_info', () => {
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

      const { baselineTotalDocCount, deviationTotalDocCount, fieldCandidates } =
        await fetchIndexInfo(esClientMock, paramsSearchQueryMock);

      expect(fieldCandidates).toEqual(['myIpFieldName', 'myKeywordFieldName']);
      expect(baselineTotalDocCount).toEqual(5000000);
      expect(deviationTotalDocCount).toEqual(5000000);
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(2);
    });
  });
});
