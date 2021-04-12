/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bucketRulesResponse,
  caseInsensitiveSort,
  showRulesTable,
  getSearchFilters,
} from './helpers';
import { mockRule, mockRuleError } from './__mocks__/mock';
import uuid from 'uuid';
import { Rule, RuleError } from '../../../../containers/detection_engine/rules';
import { Query } from '@elastic/eui';
import { EXCEPTIONS_SEARCH_SCHEMA } from './exceptions/exceptions_search_bar';

describe('AllRulesTable Helpers', () => {
  const mockRule1: Readonly<Rule> = mockRule(uuid.v4());
  const mockRule2: Readonly<Rule> = mockRule(uuid.v4());
  const mockRuleError1: Readonly<RuleError> = mockRuleError(uuid.v4());
  const mockRuleError2: Readonly<RuleError> = mockRuleError(uuid.v4());

  describe('bucketRulesResponse', () => {
    test('buckets empty response', () => {
      const bucketedResponse = bucketRulesResponse([]);
      expect(bucketedResponse).toEqual({ rules: [], errors: [] });
    });

    test('buckets all error response', () => {
      const bucketedResponse = bucketRulesResponse([mockRuleError1, mockRuleError2]);
      expect(bucketedResponse).toEqual({ rules: [], errors: [mockRuleError1, mockRuleError2] });
    });

    test('buckets all success response', () => {
      const bucketedResponse = bucketRulesResponse([mockRule1, mockRule2]);
      expect(bucketedResponse).toEqual({ rules: [mockRule1, mockRule2], errors: [] });
    });

    test('buckets mixed success/error response', () => {
      const bucketedResponse = bucketRulesResponse([
        mockRule1,
        mockRuleError1,
        mockRule2,
        mockRuleError2,
      ]);
      expect(bucketedResponse).toEqual({
        rules: [mockRule1, mockRule2],
        errors: [mockRuleError1, mockRuleError2],
      });
    });
  });

  describe('showRulesTable', () => {
    test('returns false when rulesCustomInstalled and rulesInstalled are null', () => {
      const result = showRulesTable({
        rulesCustomInstalled: null,
        rulesInstalled: null,
      });
      expect(result).toBeFalsy();
    });

    test('returns false when rulesCustomInstalled and rulesInstalled are 0', () => {
      const result = showRulesTable({
        rulesCustomInstalled: 0,
        rulesInstalled: 0,
      });
      expect(result).toBeFalsy();
    });

    test('returns false when both rulesCustomInstalled and rulesInstalled checks return false', () => {
      const result = showRulesTable({
        rulesCustomInstalled: 0,
        rulesInstalled: null,
      });
      expect(result).toBeFalsy();
    });

    test('returns true if rulesCustomInstalled is not null or 0', () => {
      const result = showRulesTable({
        rulesCustomInstalled: 5,
        rulesInstalled: null,
      });
      expect(result).toBeTruthy();
    });

    test('returns true if rulesInstalled is not null or 0', () => {
      const result = showRulesTable({
        rulesCustomInstalled: null,
        rulesInstalled: 5,
      });
      expect(result).toBeTruthy();
    });
  });

  describe('caseInsensitiveSort', () => {
    describe('when an array of differently cased tags is passed', () => {
      const unsortedTags = ['atest', 'Ctest', 'Btest', 'ctest', 'btest', 'Atest'];
      const result = caseInsensitiveSort(unsortedTags);
      it('returns an alphabetically sorted array with no regard for casing', () => {
        const expected = ['atest', 'Atest', 'Btest', 'btest', 'Ctest', 'ctest'];
        expect(result).toEqual(expected);
      });
    });
  });

  describe('getSearchFilters', () => {
    const filterOptions = {
      name: null,
      list_id: null,
      created_by: null,
      type: null,
      tags: null,
    };

    test('it does not modify filter options if no query clauses match', () => {
      const searchValues = getSearchFilters({
        query: null,
        searchValue: 'bar',
        filterOptions,
        defaultSearchTerm: 'name',
      });

      expect(searchValues).toEqual({ name: 'bar' });
    });

    test('it properly formats search options', () => {
      const query = Query.parse('name:bar list_id:some_id', { schema: EXCEPTIONS_SEARCH_SCHEMA });

      const searchValues = getSearchFilters({
        query,
        searchValue: 'bar',
        filterOptions,
        defaultSearchTerm: 'name',
      });

      expect(searchValues).toEqual({
        created_by: null,
        list_id: 'some_id',
        name: 'bar',
        tags: null,
        type: null,
      });
    });

    test('it properly formats search options when no query clauses used', () => {
      const query = Query.parse('some list name', { schema: EXCEPTIONS_SEARCH_SCHEMA });

      const searchValues = getSearchFilters({
        query,
        searchValue: 'some list name',
        filterOptions,
        defaultSearchTerm: 'name',
      });

      expect(searchValues).toEqual({ name: 'some list name' });
    });
  });
});
