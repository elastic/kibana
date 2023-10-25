/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItemGroup } from '@kbn/ml-agg-utils';

export const finalSignificantItemGroups: SignificantItemGroup[] = [
  {
    docCount: 632,
    group: [
      {
        key: 'url:login.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'login.php',
        docCount: 790,
        duplicate: 2,
        pValue: 0.012783309213417932,
      },
      {
        key: 'user:Peter',
        type: 'keyword',
        fieldName: 'user',
        fieldValue: 'Peter',
        docCount: 632,
        duplicate: 2,
        pValue: 0.012783309213417932,
      },
    ],
    id: '1937394803',
    pValue: 0.012783309213417932,
  },
  {
    docCount: 792,
    group: [
      {
        key: 'response_code:500',
        type: 'keyword',
        fieldName: 'response_code',
        fieldValue: '500',
        docCount: 792,
        duplicate: 2,
        pValue: 0.012783309213417932,
      },
      {
        key: 'url:home.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'home.php',
        docCount: 792,
        duplicate: 2,
        pValue: 0.00974308761016614,
      },
    ],
    id: '2675980076',
    pValue: 0.00974308761016614,
  },
  {
    docCount: 790,
    group: [
      {
        key: 'response_code:500',
        type: 'keyword',
        fieldName: 'response_code',
        fieldValue: '500',
        docCount: 792,
        duplicate: 2,
        pValue: 0.012783309213417932,
      },
      {
        key: 'url:login.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'login.php',
        docCount: 790,
        duplicate: 2,
        pValue: 0.012783309213417932,
      },
    ],
    id: '3819687732',
    pValue: 0.012783309213417932,
  },
  {
    docCount: 636,
    group: [
      {
        key: 'url:home.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'home.php',
        docCount: 792,
        duplicate: 2,
        pValue: 0.00974308761016614,
      },
      {
        key: 'user:Peter',
        type: 'keyword',
        fieldName: 'user',
        fieldValue: 'Peter',
        docCount: 636,
        duplicate: 2,
        pValue: 0.00974308761016614,
      },
    ],
    id: '2091742187',
    pValue: 0.00974308761016614,
  },
];
