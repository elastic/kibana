/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Category } from '../../../common/api/log_categorization/types';
import { FormattedPatternExamples } from './format_category';

const categories = [
  {
    key: 'Processed messages out of',
    examples: ['Processed 676 messages out of 676'],
  },
  {
    key: 'Processed messages out of',
    examples: ['Processed out 676 messages messages out of 676 Processed'],
  },
  {
    key: 'Processed of',
    examples: ['Processed 676 messages out of 676'],
  },
  {
    key: 'Processed messages out of',
    examples: ['Processed messages out of'],
  },
  {
    key: '',
    examples: ['Processed messages out of'],
  },
  {
    key: 'Processed messages out of',
    examples: ['Processed 676 (*?) message* out of 676'],
  },
  {
    key: '2024 0000 admin to admin console.prod 6000 api HTTP 1.1 https admin Mozilla 5.0 AppleWebKit KHTML like Gecko Chrome Safari',
    examples: [
      '[05/Jan/2024 04:11:42 +0000] 40.69.144.53 - Lucio77 admin-console.you-got.mail to: admin-console.prod.008:6000: "GET /api/listCustomers HTTP/1.1" 200 383 "https://admin-console.you-got.mail" "Mozilla/5.0 (Windows; U; Windows NT 6.3) AppleWebKit/531.1.1 (KHTML, like Gecko) Chrome/23.0.835.0 Safari/531.1.1"',
    ],
  },
] as Category[];

describe('FormattedPatternExamples', () => {
  it('renders each category correctly', () => {
    categories.forEach((category) => {
      const component = <FormattedPatternExamples category={category} />;
      expect(component).toMatchSnapshot();
    });
  });
});
