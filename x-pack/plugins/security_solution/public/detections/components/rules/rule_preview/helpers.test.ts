/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isNoisy,
  getTimeframeOptions,
  getInfoFromQueryBar,
  getIsRulePreviewDisabled,
} from './helpers';

describe('query_preview/helpers', () => {
  describe('isNoisy', () => {
    test('returns true if timeframe selection is "Last hour" and average hits per hour is greater than one execution duration', () => {
      const isItNoisy = isNoisy(30, 'h');

      expect(isItNoisy).toBeTruthy();
    });

    test('returns false if timeframe selection is "Last hour" and average hits per hour is less than one execution duration', () => {
      const isItNoisy = isNoisy(0, 'h');

      expect(isItNoisy).toBeFalsy();
    });

    test('returns true if timeframe selection is "Last day" and average hits per hour is greater than one execution duration', () => {
      const isItNoisy = isNoisy(50, 'd');

      expect(isItNoisy).toBeTruthy();
    });

    test('returns false if timeframe selection is "Last day" and average hits per hour is equal to one execution duration', () => {
      const isItNoisy = isNoisy(24, 'd');

      expect(isItNoisy).toBeFalsy();
    });

    test('returns false if timeframe selection is "Last day" and hits is 0', () => {
      const isItNoisy = isNoisy(0, 'd');

      expect(isItNoisy).toBeFalsy();
    });

    test('returns true if timeframe selection is "Last month" and average hits per hour is greater than one execution duration', () => {
      const isItNoisy = isNoisy(50, 'M');

      expect(isItNoisy).toBeTruthy();
    });

    test('returns false if timeframe selection is "Last month" and average hits per hour is equal to one execution duration', () => {
      const isItNoisy = isNoisy(30, 'M');

      expect(isItNoisy).toBeFalsy();
    });

    test('returns false if timeframe selection is "Last month" and hits is 0', () => {
      const isItNoisy = isNoisy(0, 'M');

      expect(isItNoisy).toBeFalsy();
    });
  });

  describe('isRulePreviewDisabled', () => {
    test('disabled when there is no index', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: [],
        threatIndex: ['threat-*'],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when query bar is invalid', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: false,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        threatIndex: ['threat-*'],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when threat query bar is invalid', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: false,
        index: ['test-*'],
        threatIndex: ['threat-*'],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when there is no threat index', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        threatIndex: [],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when there is no threat mapping', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        threatIndex: ['threat-*'],
        threatMapping: [],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when there is no machine learning job id', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        threatIndex: ['threat-*'],
        threatMapping: [],
        machineLearningJobId: [],
        queryBar: { filters: [], query: { query: '', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when eql rule with no query', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'eql',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        threatIndex: ['threat-*'],
        threatMapping: [],
        machineLearningJobId: [],
        queryBar: { filters: [], query: { query: '', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(true);
    });

    test('enabled', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        threatIndex: ['threat-*'],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(false);
    });

    test('enabled when eql rule with query', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'eql',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        threatIndex: ['threat-*'],
        threatMapping: [],
        machineLearningJobId: [],
        queryBar: { filters: [], query: { query: 'any where true', language: 'testlang' } },
      });
      expect(isDisabled).toEqual(false);
    });
  });

  describe('getTimeframeOptions', () => {
    test('returns hour and day options if ruleType is eql', () => {
      const options = getTimeframeOptions('eql');

      expect(options).toEqual([
        { value: 'h', text: 'Last hour' },
        { value: 'd', text: 'Last day' },
      ]);
    });

    test('returns hour, day, and month options if ruleType is not eql or threshold', () => {
      const options = getTimeframeOptions('query');

      expect(options).toEqual([
        { value: 'h', text: 'Last hour' },
        { value: 'd', text: 'Last day' },
        { value: 'M', text: 'Last month' },
      ]);
    });

    test('returns hour option if ruleType is threshold', () => {
      const options = getTimeframeOptions('threshold');

      expect(options).toEqual([{ value: 'h', text: 'Last hour' }]);
    });
  });

  describe('getInfoFromQueryBar', () => {
    test('returns queryFilter when ruleType is query', () => {
      const { queryString, language, filters, queryFilter } = getInfoFromQueryBar(
        {
          query: { query: 'host.name:*', language: 'kuery' },
          filters: [{ meta: { alias: '', disabled: false, negate: false } }],
        },
        ['foo-*'],
        'query'
      );

      expect(queryString).toEqual('host.name:*');
      expect(language).toEqual('kuery');
      expect(filters).toEqual([{ meta: { alias: '', disabled: false, negate: false }, query: {} }]);
      expect(queryFilter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] } },
            {},
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('returns queryFilter when ruleType is saved_query', () => {
      const { queryString, language, filters, queryFilter } = getInfoFromQueryBar(
        {
          query: { query: 'host.name:*', language: 'kuery' },
          filters: [{ meta: { alias: '', disabled: false, negate: false } }],
        },
        ['foo-*'],
        'saved_query'
      );

      expect(queryString).toEqual('host.name:*');
      expect(language).toEqual('kuery');
      expect(filters).toEqual([{ meta: { alias: '', disabled: false, negate: false }, query: {} }]);
      expect(queryFilter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] } },
            {},
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('returns queryFilter when ruleType is threshold', () => {
      const { queryString, language, filters, queryFilter } = getInfoFromQueryBar(
        {
          query: { query: 'host.name:*', language: 'kuery' },
          filters: [{ meta: { alias: '', disabled: false, negate: false } }],
        },
        ['foo-*'],
        'threshold'
      );

      expect(queryString).toEqual('host.name:*');
      expect(language).toEqual('kuery');
      expect(filters).toEqual([{ meta: { alias: '', disabled: false, negate: false }, query: {} }]);
      expect(queryFilter).toEqual({
        bool: {
          filter: [
            { bool: { minimum_should_match: 1, should: [{ exists: { field: 'host.name' } }] } },
            {},
          ],
          must: [],
          must_not: [],
          should: [],
        },
      });
    });

    test('returns undefined queryFilter when ruleType is eql', () => {
      const { queryString, language, filters, queryFilter } = getInfoFromQueryBar(
        {
          query: { query: 'file where true', language: 'eql' },
          filters: [{ meta: { alias: '', disabled: false, negate: false } }],
        },
        ['foo-*'],
        'eql'
      );

      expect(queryString).toEqual('file where true');
      expect(language).toEqual('eql');
      expect(filters).toEqual([{ meta: { alias: '', disabled: false, negate: false } }]);
      expect(queryFilter).toBeUndefined();
    });

    test('returns undefined queryFilter when getQueryFilter throws', () => {
      // query is malformed, forcing error in getQueryFilter
      const { queryString, language, filters, queryFilter } = getInfoFromQueryBar(
        {
          query: { query: 'host.name:', language: 'kuery' },
          filters: [{ meta: { alias: '', disabled: false, negate: false } }],
        },
        ['foo-*'],
        'threshold'
      );

      expect(queryString).toEqual('host.name:');
      expect(language).toEqual('kuery');
      expect(filters).toEqual([{ meta: { alias: '', disabled: false, negate: false } }]);
      expect(queryFilter).toBeUndefined();
    });
  });
});
