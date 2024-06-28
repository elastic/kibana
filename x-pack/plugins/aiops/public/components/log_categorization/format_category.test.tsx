/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import { useCreateFormattedExample } from './format_category';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('../../hooks/use_eui_theme', () => ({
  useIsDarkTheme: () => false,
}));

const categoryData: Array<{
  category: Category;
  elementCount: number;
}> = [
  {
    category: {
      key: 'Processed messages out of',
      count: 0,
      examples: ['Processed 676 messages out of 676'],
      regex: '.*?Processed.+?messages.+?out.+?of.*?',
    },
    elementCount: 9,
  },
  {
    category: {
      key: 'Processed messages out of',
      count: 0,
      examples: ['Processed out 676 messages messages out of 676 Processed'],
      regex: '.*?Processed.+?messages.+?out.+?of.*?',
    },
    elementCount: 9,
  },
  {
    category: {
      key: 'Processed of',
      count: 0,
      examples: ['Processed 676 messages out of 676'],
      regex: '.*?Processed.+?of.*?',
    },
    elementCount: 5,
  },
  {
    category: {
      key: 'Processed messages out of',
      count: 0,
      examples: ['Processed messages out of'],
      regex: '.*?Processed.+?messages.+?out.+?of.*?',
    },
    elementCount: 9,
  },
  {
    category: {
      key: '',
      count: 0,
      examples: ['Processed messages out of'],
      regex: '.*?',
    },
    elementCount: 3,
  },
  {
    category: {
      key: 'Processed messages out of',
      count: 0,
      examples: ['Processed 676 (*?) message* out of 676'],
      regex: '.*?Processed.+?messages.+?out.+?of.*?',
    },
    elementCount: 9,
  },
  {
    category: {
      key: '2024 0000 admin to admin console.prod 6000 api HTTP 1.1 https admin Mozilla 5.0 AppleWebKit KHTML like Gecko Chrome Safari',
      count: 0,
      examples: [
        '[05/Jan/2024 04:11:42 +0000] 40.69.144.53 - Lucio77 admin-console.you-got.mail to: admin-console.prod.008:6000: "GET /api/listCustomers HTTP/1.1" 200 383 "https://admin-console.you-got.mail" "Mozilla/5.0 (Windows; U; Windows NT 6.3) AppleWebKit/531.1.1 (KHTML, like Gecko) Chrome/23.0.835.0 Safari/531.1.1"',
      ],
      regex:
        '.*?2024.+?0000.+?admin.+?to.+?admin.+?console.prod.+?6000.+?api.+?HTTP.+?1.1.+?https.+?admin.+?Mozilla.+?5.0.+?AppleWebKit.+?KHTML.+?like.+?Gecko.+?Chrome.+?Safari.*?',
    },
    elementCount: 41,
  },
];

describe('FormattedPatternExamples', () => {
  it('correctly splits each example into correct number of html elements', () => {
    categoryData.forEach(({ category, elementCount }) => {
      const { result } = renderHook(() => useCreateFormattedExample());
      const createFormattedExample = result.current;
      const resp = createFormattedExample(category.key, category.examples[0]);
      expect(resp.length).toEqual(elementCount);
    });
  });
});
