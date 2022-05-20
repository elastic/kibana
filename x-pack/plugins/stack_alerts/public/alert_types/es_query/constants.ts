/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/triggers-actions-ui-plugin/public';
import { ErrorKey } from './types';

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

export const EXPRESSION_ERRORS = {
  index: new Array<string>(),
  size: new Array<string>(),
  timeField: new Array<string>(),
  threshold0: new Array<string>(),
  threshold1: new Array<string>(),
  esQuery: new Array<string>(),
  thresholdComparator: new Array<string>(),
  timeWindowSize: new Array<string>(),
  searchConfiguration: new Array<string>(),
};

export const EXPRESSION_ERROR_KEYS = Object.keys(EXPRESSION_ERRORS) as ErrorKey[];
