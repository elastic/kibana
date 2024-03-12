/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItem } from '@kbn/ml-agg-utils';

import type { GroupTableItem } from '../../components/log_rate_analysis_results_table/types';

import { buildExtendedBaseFilterCriteria } from './build_extended_base_filter_criteria';

const selectedSignificantItemMock: SignificantItem = {
  key: 'meta.cloud.instance_id.keyword:1234',
  type: 'keyword',
  doc_count: 53408,
  bg_count: 1154,
  fieldName: 'meta.cloud.instance_id.keyword',
  fieldValue: '1234',
  normalizedScore: 1,
  pValue: 0.01,
  score: 708.3964185322641,
  total_bg_count: 179657,
  total_doc_count: 114011,
};

const selectedGroupMock: GroupTableItem = {
  id: '21289599',
  docCount: 20468,
  pValue: 2.2250738585072626e-308,
  uniqueItemsCount: 3,
  groupItemsSortedByUniqueness: [
    {
      key: 'error.message:rate limit exceeded',
      type: 'keyword',
      fieldName: 'error.message',
      fieldValue: 'rate limit exceeded',
      docCount: 10,
      pValue: 0.05,
    },
    {
      key: 'message:too many requests',
      type: 'keyword',
      fieldName: 'message',
      fieldValue: 'too many requests',
      docCount: 10,
      pValue: 0.05,
    },
    {
      key: 'user_agent.original.keyword:Mozilla/5.0',
      type: 'keyword',
      fieldName: 'user_agent.original.keyword',
      fieldValue: 'Mozilla/5.0',
      docCount: 10,
      pValue: 0.05,
    },
    {
      key: 'beat.hostname.keyword:ip-192-168-1-1',
      type: 'keyword',
      fieldName: 'beat.hostname.keyword',
      fieldValue: 'ip-192-168-1-1',
      docCount: 10,
      pValue: 0.05,
    },
    {
      key: 'beat.name.keyword:i-1234',
      type: 'keyword',
      fieldName: 'beat.name.keyword',
      fieldValue: 'i-1234',
      docCount: 10,
      pValue: 0.05,
    },
    {
      key: 'docker.container.id.keyword:asdf',
      type: 'keyword',
      fieldName: 'docker.container.id.keyword',
      fieldValue: 'asdf',
      docCount: 10,
      pValue: 0.05,
    },
  ],
  histogram: [],
};

describe('query_utils', () => {
  describe('buildExtendedBaseFilterCriteria', () => {
    it('returns range filter based on minimum supplied arguments', () => {
      const baseFilterCriteria = buildExtendedBaseFilterCriteria('the-time-field-name', 1234, 5678);

      expect(baseFilterCriteria).toEqual([
        {
          range: {
            'the-time-field-name': {
              format: 'epoch_millis',
              gte: 1234,
              lte: 5678,
            },
          },
        },
      ]);
    });

    it('returns filters including default query with supplied arguments provided via UI', () => {
      const baseFilterCriteria = buildExtendedBaseFilterCriteria(
        '@timestamp',
        1640082000012,
        1640103600906,
        { match_all: {} }
      );

      expect(baseFilterCriteria).toEqual([
        {
          range: {
            '@timestamp': {
              format: 'epoch_millis',
              gte: 1640082000012,
              lte: 1640103600906,
            },
          },
        },
      ]);
    });

    it('includes a term filter when including a selectedSignificantItem', () => {
      const baseFilterCriteria = buildExtendedBaseFilterCriteria(
        '@timestamp',
        1640082000012,
        1640103600906,
        { match_all: {} },
        selectedSignificantItemMock
      );

      expect(baseFilterCriteria).toEqual([
        {
          range: {
            '@timestamp': {
              format: 'epoch_millis',
              gte: 1640082000012,
              lte: 1640103600906,
            },
          },
        },
        { term: { 'meta.cloud.instance_id.keyword': '1234' } },
      ]);
    });

    it('includes a term filter with must_not when excluding a selectedSignificantItem', () => {
      const baseFilterCriteria = buildExtendedBaseFilterCriteria(
        '@timestamp',
        1640082000012,
        1640103600906,
        { match_all: {} },
        selectedSignificantItemMock,
        false
      );

      expect(baseFilterCriteria).toEqual([
        {
          range: {
            '@timestamp': {
              format: 'epoch_millis',
              gte: 1640082000012,
              lte: 1640103600906,
            },
          },
        },
        { bool: { must_not: [{ term: { 'meta.cloud.instance_id.keyword': '1234' } }] } },
      ]);
    });

    it('includes multiple term filters when including a selectedGroupMock', () => {
      const baseFilterCriteria = buildExtendedBaseFilterCriteria(
        '@timestamp',
        1640082000012,
        1640103600906,
        { match_all: {} },
        undefined,
        true,
        selectedGroupMock
      );

      expect(baseFilterCriteria).toEqual([
        {
          range: {
            '@timestamp': {
              format: 'epoch_millis',
              gte: 1640082000012,
              lte: 1640103600906,
            },
          },
        },
        {
          term: {
            'error.message': 'rate limit exceeded',
          },
        },
        {
          term: {
            message: 'too many requests',
          },
        },
        {
          term: {
            'user_agent.original.keyword': 'Mozilla/5.0',
          },
        },
        {
          term: {
            'beat.hostname.keyword': 'ip-192-168-1-1',
          },
        },
        {
          term: {
            'beat.name.keyword': 'i-1234',
          },
        },
        {
          term: {
            'docker.container.id.keyword': 'asdf',
          },
        },
      ]);
    });

    it('includes a must_not with nested term filters when excluding a selectedGroup', () => {
      const baseFilterCriteria = buildExtendedBaseFilterCriteria(
        '@timestamp',
        1640082000012,
        1640103600906,
        { match_all: {} },
        undefined,
        false,
        selectedGroupMock
      );

      expect(baseFilterCriteria).toEqual([
        {
          range: {
            '@timestamp': {
              format: 'epoch_millis',
              gte: 1640082000012,
              lte: 1640103600906,
            },
          },
        },
        {
          bool: {
            must_not: [
              {
                bool: {
                  filter: [
                    {
                      term: {
                        'error.message': 'rate limit exceeded',
                      },
                    },
                    {
                      term: {
                        message: 'too many requests',
                      },
                    },
                    {
                      term: {
                        'user_agent.original.keyword': 'Mozilla/5.0',
                      },
                    },
                    {
                      term: {
                        'beat.hostname.keyword': 'ip-192-168-1-1',
                      },
                    },
                    {
                      term: {
                        'beat.name.keyword': 'i-1234',
                      },
                    },
                    {
                      term: {
                        'docker.container.id.keyword': 'asdf',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ]);
    });
  });
});
