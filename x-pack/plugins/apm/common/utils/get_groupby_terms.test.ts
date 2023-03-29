/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupByTerms } from './get_groupby_terms';

describe('get terms fields based on group-by', () => {
  it('returns single terms field', () => {
    const ruleParams = { groupBy: 'service.version' };
    const terms = getGroupByTerms(ruleParams);
    expect(terms).toEqual([
      { field: 'service.version', missing: 'SERVICE_VERSION_NOT_DEFINED' },
    ]);
  });

  it('returns multiple terms fields', () => {
    const ruleParams = { groupBy: ['service.version', 'container.id'] };
    const terms = getGroupByTerms(ruleParams);
    expect(terms).toEqual([
      { field: 'service.version', missing: 'SERVICE_VERSION_NOT_DEFINED' },
      { field: 'container.id', missing: 'CONTAINER_ID_NOT_DEFINED' },
    ]);
  });

  it('returns an empty array', () => {
    const ruleParams = { groupBy: undefined };
    const terms = getGroupByTerms(ruleParams);
    expect(terms).toEqual([]);
  });
});
