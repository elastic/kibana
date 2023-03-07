/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePointGroup } from '@kbn/ml-agg-utils';

export const finalChangePointGroups: ChangePointGroup[] = [
  {
    id: '2038579476',
    group: [
      { fieldName: 'response_code', fieldValue: '500', duplicate: false },
      { fieldName: 'url', fieldValue: 'home.php', duplicate: false },
      { fieldName: 'url', fieldValue: 'login.php', duplicate: false },
    ],
    docCount: 792,
    pValue: 0.010770456205312423,
  },
  {
    id: '817080373',
    group: [{ fieldName: 'user', fieldValue: 'Peter', duplicate: false }],
    docCount: 1981,
    pValue: 2.7454255728359757e-21,
  },
];
