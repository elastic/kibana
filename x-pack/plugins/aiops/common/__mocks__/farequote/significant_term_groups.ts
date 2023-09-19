/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantTermGroup } from '@kbn/ml-agg-utils';

export const significantTermGroups: SignificantTermGroup[] = [
  {
    id: 'group-1',
    group: [
      {
        fieldName: 'custom_field.keyword',
        fieldValue: 'deviation',
        docCount: 101,
        pValue: 0.01,
      },
      {
        fieldName: 'airline',
        fieldValue: 'UAL',
        docCount: 101,
        pValue: 0.01,
      },
    ],
    docCount: 101,
    pValue: 0.01,
  },
  {
    id: 'group-2',
    group: [
      {
        fieldName: 'custom_field.keyword',
        fieldValue: 'deviation',
        docCount: 49,
        pValue: 0.001,
      },
      {
        fieldName: 'airline',
        fieldValue: 'AAL',
        docCount: 49,
        pValue: 0.001,
      },
    ],
    docCount: 49,
    pValue: 0.001,
  },
];
