/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsFilter } from './get_es_filter';

describe('getEfFilters', function () {
  it('should return environment in include filters', function () {
    const result = getEsFilter({
      browser: ['Chrome'],
      environment: 'production',
    });

    expect(result).toEqual([
      { terms: { 'user_agent.name': ['Chrome'] } },
      { term: { 'service.environment': 'production' } },
    ]);
  });

  it('should not return environment in exclude filters', function () {
    const result = getEsFilter(
      { browserExcluded: ['Chrome'], environment: 'production' },
      true
    );

    expect(result).toEqual([{ terms: { 'user_agent.name': ['Chrome'] } }]);
  });
});
