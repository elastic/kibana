/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantTermGroup } from '@kbn/ml-agg-utils';

export const finalSignificantTermGroups: SignificantTermGroup[] = [
  {
    id: '40215074',
    group: [
      {
        fieldName: 'response_code',
        fieldValue: '500',
        duplicate: 2,
        docCount: 792,
        pValue: 0.010770456205312423,
      },
      {
        fieldName: 'url',
        fieldValue: 'home.php',
        duplicate: 2,
        docCount: 792,
        pValue: 0.010770456205312423,
      },
    ],
    docCount: 792,
    pValue: 0.010770456205312423,
  },
  {
    id: '237328782',
    group: [
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'response_code',
        fieldValue: '500',
        pValue: 0.010770456205312423,
      },
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'login.php',
        pValue: 0.010770456205312423,
      },
    ],
    docCount: 792,
    pValue: 0.010770456205312423,
  },
  {
    id: '47022118',
    group: [
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'home.php',
        pValue: 0.010770456205312423,
      },
      {
        docCount: 634,
        duplicate: 2,
        fieldName: 'user',
        fieldValue: 'Peter',
        pValue: 0.010770456205312423,
      },
    ],
    docCount: 634,
    pValue: 0.010770456205312423,
  },
  {
    id: '1176404482',
    group: [
      {
        docCount: 792,
        duplicate: 2,
        fieldName: 'url',
        fieldValue: 'login.php',
        pValue: 0.010770456205312423,
      },
      {
        docCount: 634,
        duplicate: 2,
        fieldName: 'user',
        fieldValue: 'Peter',
        pValue: 0.010770456205312423,
      },
    ],
    docCount: 634,
    pValue: 0.010770456205312423,
  },
];
