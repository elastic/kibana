/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GlobalSearchResult } from '@kbn/global-search-plugin/common/types';
import { resultToOption } from './result_to_option';

const createSearchResult = (parts: Partial<GlobalSearchResult> = {}): GlobalSearchResult => ({
  id: 'id',
  title: 'title',
  type: 'application',
  icon: 'some-icon',
  score: 100,
  url: '/url',
  meta: {},
  ...parts,
});

describe('resultToOption', () => {
  it('converts the result to the expected format', () => {
    const input = createSearchResult({});
    expect(resultToOption(input, [])).toEqual({
      key: input.id,
      label: input.title,
      url: input.url,
      type: input.type,
      icon: { type: expect.any(String) },
      'data-test-subj': expect.any(String),
      meta: expect.any(Array),
    });
  });

  it('uses icon for `application` type', () => {
    const input = createSearchResult({ type: 'application', icon: 'app-icon' });
    expect(resultToOption(input, [])).toEqual(
      expect.objectContaining({
        icon: { type: 'app-icon' },
      })
    );
  });

  it('uses icon for `integration` type', () => {
    const input = createSearchResult({ type: 'integration', icon: 'integ-icon' });
    expect(resultToOption(input, [])).toEqual(
      expect.objectContaining({
        icon: { type: 'integ-icon' },
      })
    );
  });

  it('does not use icon for other types', () => {
    const input = createSearchResult({ type: 'dashboard', icon: 'dash-icon' });
    expect(resultToOption(input, [])).toEqual(
      expect.objectContaining({
        icon: { type: 'empty' },
      })
    );
  });

  it('uses the category label as meta for `application` type', () => {
    const input = createSearchResult({ type: 'application', meta: { categoryLabel: 'category' } });
    expect(resultToOption(input, [])).toEqual(
      expect.objectContaining({
        meta: [{ text: 'category' }],
      })
    );
  });

  it('uses the type as meta for non-`application` type', () => {
    const input = createSearchResult({ type: 'dashboard', meta: { categoryLabel: 'category' } });
    expect(resultToOption(input, [])).toEqual(
      expect.objectContaining({
        meta: [{ text: 'Dashboard' }],
      })
    );
  });

  it('uses the displayName as meta for non-`application` type when provided', () => {
    const input = createSearchResult({
      type: 'dashboard',
      meta: { categoryLabel: 'category', displayName: 'foo' },
    });
    expect(resultToOption(input, [])).toEqual(
      expect.objectContaining({
        meta: [{ text: 'Foo' }],
      })
    );
  });
});
