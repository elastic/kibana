/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailureMessage } from '../../detections/rules/types';
import { transformCategories } from './transform_categories';

describe('transform_categories', () => {
  test('it transforms an empty array into an empty object', () => {
    const result = transformCategories({
      buckets: [],
    });
    expect(result).toEqual<FailureMessage[]>([]);
  });

  test('it transforms a single element into a single output', () => {
    const result = transformCategories({
      buckets: [
        {
          doc_count: 6,
          key: 'category-1',
        },
      ],
    });
    expect(result).toEqual<FailureMessage[]>([
      {
        count: 6,
        message: 'category-1',
      },
    ]);
  });

  test('it transforms 2 elements into 2 outputs', () => {
    const result = transformCategories({
      buckets: [
        {
          doc_count: 6,
          key: 'category-1',
        },
        {
          doc_count: 5,
          key: 'category-2',
        },
      ],
    });
    expect(result).toEqual<FailureMessage[]>([
      {
        count: 6,
        message: 'category-1',
      },
      {
        count: 5,
        message: 'category-2',
      },
    ]);
  });

  test('it transforms 10 elements into 10 outputs', () => {
    const result = transformCategories({
      buckets: [
        {
          doc_count: 10,
          key: 'category-10',
        },
        {
          doc_count: 9,
          key: 'category-9',
        },
        {
          doc_count: 8,
          key: 'category-8',
        },
        {
          doc_count: 7,
          key: 'category-7',
        },
        {
          doc_count: 6,
          key: 'category-6',
        },
        {
          doc_count: 5,
          key: 'category-5',
        },
        {
          doc_count: 4,
          key: 'category-4',
        },
        {
          doc_count: 3,
          key: 'category-3',
        },
        {
          doc_count: 2,
          key: 'category-2',
        },
        {
          doc_count: 1,
          key: 'category-1',
        },
      ],
    });
    expect(result).toEqual<FailureMessage[]>([
      {
        message: 'category-10',
        count: 10,
      },
      {
        message: 'category-9',
        count: 9,
      },
      {
        message: 'category-8',
        count: 8,
      },
      {
        message: 'category-7',
        count: 7,
      },
      {
        message: 'category-6',
        count: 6,
      },
      {
        message: 'category-5',
        count: 5,
      },
      {
        message: 'category-4',
        count: 4,
      },
      {
        message: 'category-3',
        count: 3,
      },
      {
        message: 'category-2',
        count: 2,
      },
      {
        message: 'category-1',
        count: 1,
      },
    ]);
  });
});
