/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantTermGroup } from '@kbn/ml-agg-utils';

export const finalSignificantTermGroups: SignificantTermGroup[] = [
  {
    docCount: 632,
    group: [
      {
        docCount: 790,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'login.php',
        pValue: 0.012783309213417932,
      },
      {
        docCount: 632,
        duplicate: 2,
        fieldName: 'user',
        fieldValue: 'Peter',
        pValue: 0.012783309213417932,
      },
    ],
    id: '1982924514',
    pValue: 0.012783309213417932,
  },
  {
    docCount: 792,
    group: [
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'response_code',
        fieldValue: '500',
        pValue: 0.012783309213417932,
      },
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'home.php',
        pValue: 0.00974308761016614,
      },
    ],
    id: '2052830342',
    pValue: 0.00974308761016614,
  },
  {
    docCount: 790,
    group: [
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'response_code',
        fieldValue: '500',
        pValue: 0.012783309213417932,
      },
      {
        docCount: 790,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'login.php',
        pValue: 0.012783309213417932,
      },
    ],
    id: '3851735068',
    pValue: 0.012783309213417932,
  },
  {
    docCount: 636,
    group: [
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'home.php',
        pValue: 0.00974308761016614,
      },
      {
        docCount: 636,
        duplicate: 2,
        fieldName: 'user',
        fieldValue: 'Peter',
        pValue: 0.00974308761016614,
      },
    ],
    id: '92732022',
    pValue: 0.00974308761016614,
  },
];
