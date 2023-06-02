/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantTermGroup } from '@kbn/ml-agg-utils';

export const significantTermGroups: SignificantTermGroup[] = [
  {
    id: '2038579476',
    group: [
      {
        fieldName: 'response_code',
        fieldValue: '500',
        docCount: 1819,
        pValue: 2.9589053032077285e-12,
      },
      { fieldName: 'url', fieldValue: 'home.php', docCount: 1744, pValue: 0.010770456205312423 },
    ],
    docCount: 792,
    pValue: 0.010770456205312423,
  },
];
