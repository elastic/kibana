/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataSourceType } from '../../../pages/detection_engine/rules/types';
import { isNoisy, getTimeframeOptions, getIsRulePreviewDisabled } from './helpers';

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
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: ['threat-*'],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when query bar is invalid', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: false,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: ['threat-*'],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when threat query bar is invalid', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: false,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: ['threat-*'],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when there is no threat index', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: [],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when there is no threat mapping', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: ['threat-*'],
        threatMapping: [],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when there is no machine learning job id', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: ['threat-*'],
        threatMapping: [],
        machineLearningJobId: [],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when eql rule with no query', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'eql',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: ['threat-*'],
        threatMapping: [],
        machineLearningJobId: [],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(true);
    });

    test('disabled when new_terms rule with no fields', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'new_terms',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: [],
        threatMapping: [],
        machineLearningJobId: [],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(true);
    });

    test('enabled', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'threat_match',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: ['threat-*'],
        threatMapping: [
          { entries: [{ field: 'test-field', value: 'test-value', type: 'mapping' }] },
        ],
        machineLearningJobId: ['test-ml-job-id'],
        queryBar: { filters: [], query: { query: '', language: 'testlang' }, saved_id: null },
        newTermsFields: [],
      });
      expect(isDisabled).toEqual(false);
    });

    test('enabled when eql rule with query', () => {
      const isDisabled = getIsRulePreviewDisabled({
        ruleType: 'eql',
        isQueryBarValid: true,
        isThreatQueryBarValid: true,
        index: ['test-*'],
        dataViewId: undefined,
        dataSourceType: DataSourceType.IndexPatterns,
        threatIndex: ['threat-*'],
        threatMapping: [],
        machineLearningJobId: [],
        queryBar: {
          filters: [],
          query: { query: 'any where true', language: 'testlang' },
          saved_id: null,
        },
        newTermsFields: [],
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
});
