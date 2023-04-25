/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterBy, getFormulaByFilter } from './get_formula_by_filter';

describe('getFormulaByFilter', () => {
  test('should return the correct formula for Searches filter without shift', () => {
    const formula = getFormulaByFilter(FilterBy.Searches);
    expect(formula).toBe("count(search.query, kql='event.action: search')");
  });

  test('should return the correct formula for NoResults filter with shift', () => {
    const formula = getFormulaByFilter(FilterBy.NoResults, '1d');
    expect(formula).toBe(
      "count(kql='search.results.total_results : 0 and event.action: search', shift='1d')"
    );
  });

  test('should return the correct formula for Clicks filter without shift', () => {
    const formula = getFormulaByFilter(FilterBy.Clicks);
    expect(formula).toBe("count(kql='event.action: search_click')");
  });

  test('should return the correct formula for Sessions filter with shift', () => {
    const formula = getFormulaByFilter(FilterBy.Sessions, '7d');
    expect(formula).toBe("unique_count(session.id, shift='7d')");
  });
});
