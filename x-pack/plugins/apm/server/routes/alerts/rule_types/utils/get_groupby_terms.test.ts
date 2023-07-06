/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGroupByTerms } from './get_groupby_terms';

describe('get terms fields for multi-terms aggregation', () => {
  it('returns terms array based on the group-by fields', () => {
    const ruleParams = {
      groupBy: [
        'service.name',
        'service.environment',
        'transaction.type',
        'transaction.name',
      ],
    };
    const terms = getGroupByTerms(ruleParams.groupBy);
    expect(terms).toEqual([
      { field: 'service.name' },
      { field: 'service.environment', missing: 'ENVIRONMENT_NOT_DEFINED' },
      { field: 'transaction.type' },
      { field: 'transaction.name' },
    ]);
  });

  it('returns an empty terms array when group-by is undefined', () => {
    const ruleParams = { groupBy: undefined };
    const terms = getGroupByTerms(ruleParams.groupBy);
    expect(terms).toEqual([]);
  });
});
