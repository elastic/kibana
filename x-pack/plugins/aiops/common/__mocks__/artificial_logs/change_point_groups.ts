/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointGroup } from '@kbn/ml-agg-utils';

export const changePointGroups: ChangePointGroup[] = [
  {
    id: '2038579476',
    group: [
      { fieldName: 'response_code', fieldValue: '500' },
      { fieldName: 'url', fieldValue: 'home.php' },
    ],
    docCount: 792,
    pValue: 0.010770456205312423,
  },
];
