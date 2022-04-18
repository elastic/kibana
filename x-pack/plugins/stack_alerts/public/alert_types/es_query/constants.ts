/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/triggers-actions-ui-plugin/public';

export const DEFAULT_VALUES = {
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  QUERY: `{
    "query":{
      "match_all" : {}
    }
  }`,
  SIZE: 100,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  THRESHOLD: [1000],
};
