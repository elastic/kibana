/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mixKqlWithTags } from './mix_kql_with_tags';

describe('mixKQlQWithTags', () => {
  it('mixes kql with selected tags', async () => {
    const query = 'something';
    const tags = {
      included: ['production'],
      excluded: [],
    };

    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe('something and slo.tags: (production)');
  });

  it('mixes kql with cleared out tags', async () => {
    const query = 'something';
    const tags = {
      included: [],
      excluded: [],
    };

    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe('something');
  });

  it('mixes kql with included and excluded tags', async () => {
    const query = 'something';
    const tags = {
      included: ['production'],
      excluded: ['dev'],
    };

    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe('something and slo.tags: (production) and not slo.tags: (dev)');
  });
});
