/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSymptomTreeId,
  normalizeSymptomSlug,
  symptomFilePath,
  symptomSlugError,
  symptomSlugFromTreeId,
  symptomTreeId,
} from './symptom';

describe('normalizeSymptomSlug', () => {
  it('lowercases and collapses separators to single hyphens', () => {
    expect(normalizeSymptomSlug('Checkout  High P99 Latency')).toBe('checkout-high-p99-latency');
  });

  it('drops leading and trailing separators', () => {
    expect(normalizeSymptomSlug('--checkout-latency--')).toBe('checkout-latency');
  });

  it('never leaves a trailing hyphen after truncation', () => {
    expect(normalizeSymptomSlug(`${'a'.repeat(79)}-bbbb`)).toBe('a'.repeat(79));
  });
});

describe('symptomTreeId and symptomSlugFromTreeId', () => {
  it('round-trips a slug through the tree id', () => {
    expect(symptomSlugFromTreeId(symptomTreeId('Checkout High Latency'))).toBe(
      'checkout-high-latency'
    );
  });

  it('accepts a bare slug where a tree id is expected', () => {
    expect(symptomSlugFromTreeId('checkout-high-latency')).toBe('checkout-high-latency');
  });

  it('builds the symptom-prefixed id', () => {
    expect(symptomTreeId('checkout-high-latency')).toBe('symptom:checkout-high-latency');
  });
});

describe('symptomFilePath', () => {
  it('builds the workspace path from a slug', () => {
    expect(symptomFilePath('checkout-high-latency')).toBe(
      'decision-trees/decision_tree_checkout-high-latency.md'
    );
  });

  it('accepts a full tree id', () => {
    expect(symptomFilePath('symptom:checkout-high-latency')).toBe(
      'decision-trees/decision_tree_checkout-high-latency.md'
    );
  });
});

describe('isSymptomTreeId', () => {
  it.each([
    ['symptom:checkout-high-latency', true],
    ['monitor_id:881680', false],
    ['symptom:', false],
    ['checkout-high-latency', false],
  ])('%s -> %s', (treeId, expected) => {
    expect(isSymptomTreeId(treeId)).toBe(expected);
  });
});

describe('symptomSlugError', () => {
  it('accepts a well-formed slug', () => {
    expect(symptomSlugError('checkout-high-p99-latency')).toBeUndefined();
  });

  it('rejects a single-word slug', () => {
    expect(symptomSlugError('checkout')).toMatch(/must be 2-5 words/);
  });

  it('rejects a slug longer than five words', () => {
    expect(symptomSlugError('a-b-c-d-e-f')).toMatch(/must be 2-5 words/);
  });

  it('rejects non-kebab-case input', () => {
    expect(symptomSlugError('Checkout_Latency')).toMatch(/must be kebab-case/);
  });

  it('rejects an empty slug', () => {
    expect(symptomSlugError('')).toBe('Symptom slug is required');
  });
});
