/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mixKqlWithTags } from './mix_kql_with_tags';

describe('mixKqlWithTags', () => {
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

  it('mixes empty query with tags', async () => {
    const query = '';
    const tags = {
      included: ['production'],
      excluded: ['dev'],
    };
    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe('slo.tags: (production) and not slo.tags: (dev)');
  });

  it('mixes empty query with empty tags', async () => {
    const query = '';
    const tags = {
      included: [],
      excluded: [],
    };

    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe('');
  });

  it('mixes empty query with undefined tags', async () => {
    const query = '';
    const tags = {
      included: undefined,
      excluded: undefined,
    };

    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe('');
  });

  it('mixes query with multiple included tags', async () => {
    const query = 'something';
    const tags = {
      included: ['production', 'staging'],
      excluded: [],
    };

    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe('something and slo.tags: (production or staging)');
  });

  it('mixes query with multiple excluded tags', async () => {
    const query = 'something';
    const tags = {
      included: [],
      excluded: ['dev', 'production'],
    };

    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe('something and not slo.tags: (dev or production)');
  });

  it('mixes query with multiple included and multiple excluded tags', async () => {
    const query = 'something';
    const tags = {
      included: ['production', 'staging'],
      excluded: ['dev', 'pre', 'qa'],
    };

    const kqlQueryMixedValue = mixKqlWithTags(query, tags);
    expect(kqlQueryMixedValue).toBe(
      'something and slo.tags: (production or staging) and not slo.tags: (dev or pre or qa)'
    );
  });
});
