/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupRulesBySearchType } from './group_rules_by_search_type';

describe('groupRulesBySearchType', () => {
  test('should correctly group search types', () => {
    expect(
      groupRulesBySearchType({
        esQuery: 1,
        searchSource: 2,
        esqlQuery: 3,
        foo: 5,
      })
    ).toEqual({
      es_query: 1,
      search_source: 2,
      esql_query: 3,
    });
  });

  test('should fallback to 0 if any of the expected search types are absent', () => {
    expect(groupRulesBySearchType({ unknown: 100, bar: 300 })).toEqual({
      es_query: 0,
      search_source: 0,
      esql_query: 0,
    });
  });
});
