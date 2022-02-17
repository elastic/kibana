/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from 'src/core/server';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

import { hasPrefixToInclude } from '../../../../common/correlations/utils';

import {
  fetchTransactionDurationFieldCandidates,
  getRandomDocsRequest,
  shouldBeExcluded,
} from './query_field_candidates';

const params = {
  index: 'apm-*',
  start: 1577836800000,
  end: 1609459200000,
  includeFrozen: false,
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};

describe('query_field_candidates', () => {
  describe('shouldBeExcluded', () => {
    it('does not exclude a completely custom field name', () => {
      expect(shouldBeExcluded('myFieldName')).toBe(false);
    });

    it(`excludes a field if it's one of FIELDS_TO_EXCLUDE_AS_CANDIDATE`, () => {
      expect(shouldBeExcluded('transaction.type')).toBe(true);
    });

    it(`excludes a field if it's prefixed with one of FIELD_PREFIX_TO_EXCLUDE_AS_CANDIDATE`, () => {
      expect(shouldBeExcluded('observer.myFieldName')).toBe(true);
    });
  });

  describe('hasPrefixToInclude', () => {
    it('identifies if a field name is prefixed to be included', () => {
      expect(hasPrefixToInclude('myFieldName')).toBe(false);
      expect(hasPrefixToInclude('somePrefix.myFieldName')).toBe(false);
      expect(hasPrefixToInclude('cloud.myFieldName')).toBe(true);
      expect(hasPrefixToInclude('labels.myFieldName')).toBe(true);
      expect(hasPrefixToInclude('user_agent.myFieldName')).toBe(true);
    });
  });

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
                    {
                      term: {
                        'processor.event': 'transaction',
                      },
                    },
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
              random_score: {},
            },
          },
          size: 1000,
        },
        index: params.index,
        ignore_throttled: params.includeFrozen ? false : undefined,
        ignore_unavailable: true,
      });
    });
  });

  describe('fetchTransactionDurationFieldCandidates', () => {
    it('returns field candidates and total hits', async () => {
      const esClientFieldCapsMock = jest.fn(() => ({
        fields: {
          myIpFieldName: { ip: {} },
          myKeywordFieldName: { keyword: {} },
          myUnpopulatedKeywordFieldName: { keyword: {} },
          myNumericFieldName: { number: {} },
        },
      }));
      const esClientSearchMock = jest.fn(
        (req: estypes.SearchRequest): estypes.SearchResponse => {
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
        }
      );

      const esClientMock = {
        fieldCaps: esClientFieldCapsMock,
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const resp = await fetchTransactionDurationFieldCandidates(
        esClientMock,
        params
      );

      expect(resp).toEqual({
        fieldCandidates: [
          // default field candidates
          'service.version',
          'service.node.name',
          'service.framework.version',
          'service.language.version',
          'service.runtime.version',
          'kubernetes.pod.name',
          'kubernetes.pod.uid',
          'container.id',
          'source.ip',
          'client.ip',
          'host.ip',
          'service.environment',
          'process.args',
          'http.response.status_code',
          // field candidates identified by sample documents
          'myIpFieldName',
          'myKeywordFieldName',
        ],
      });
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(1);
    });
  });
});
