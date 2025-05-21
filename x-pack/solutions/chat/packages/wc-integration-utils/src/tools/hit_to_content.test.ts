/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { hitToContent } from './hit_to_content';

const createSearchHit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  _index: 'test-index',
  _id: 'test-id',
  _score: 1,
  _source: {},
  ...overrides,
});

describe('hitToContent', () => {
  it('should return highlighted fields when highlights are present', () => {
    const hit = createSearchHit({
      _source: {
        title: 'Original title',
        content: 'Original content',
      },
      highlight: {
        title: ['Highlighted title'],
        content: ['Highlighted content'],
      },
    });

    const result = hitToContent({
      hit,
      fields: ['title', 'content'],
    });

    expect(result).toEqual({
      title: ['Highlighted title'],
      content: ['Highlighted content'],
    });
  });

  it('should fall back to _source when highlights are not present', () => {
    const hit = createSearchHit({
      _source: {
        title: 'Original title',
        content: 'Original content',
      },
    });

    const result = hitToContent({
      hit,
      fields: ['title', 'content'],
    });

    expect(result).toEqual({
      title: 'Original title',
      content: 'Original content',
    });
  });

  it('should handle undefined _source', () => {
    const hit = createSearchHit({
      _source: undefined,
      highlight: {
        title: ['Highlighted title'],
      },
    });

    const result = hitToContent({
      hit,
      fields: ['title', 'content'],
    });

    expect(result).toEqual({
      title: ['Highlighted title'],
      content: undefined,
    });
  });

  it('should handle non-existent fields', () => {
    const hit = createSearchHit({
      _source: {
        title: 'Original title',
      },
    });

    const result = hitToContent({
      hit,
      fields: ['title', 'nonExistentField'],
    });

    expect(result).toEqual({
      title: 'Original title',
      nonExistentField: undefined,
    });
  });
});
