/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SLOList } from '../../../typings/slo';

export const useFetchSloList = (name?: string): [boolean, SLOList] => {
  return [
    false,
    {
      results: [
        {
          id: 'mock-id',
          name: 'Great SLO',
          objective: { target: 0.8 },
          summary: { sliValue: 0.7, errorBudget: { remaining: 2 } },
        },
      ],
      total: 20,
      page: 1,
      perPage: 50,
    },
  ];
};
