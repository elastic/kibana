/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { makeDateRangeFilter } from './make_date_rate_filter';

export const getFilterClause = (
  dateRangeStart: string,
  dateRangeEnd: string,
  additionalKeys?: Array<{ [key: string]: any }>
) =>
  additionalKeys && additionalKeys.length > 0
    ? [makeDateRangeFilter(dateRangeStart, dateRangeEnd), ...additionalKeys]
    : [makeDateRangeFilter(dateRangeStart, dateRangeEnd)];
