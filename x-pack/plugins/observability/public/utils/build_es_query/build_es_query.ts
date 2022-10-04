/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery as kbnBuildEsQuery, TimeRange } from '@kbn/es-query';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { getRelativeTime } from '@kbn/data-plugin/common';

export function buildEsQuery(timeRange: TimeRange, kuery?: string) {
  const timeFilter =
    timeRange &&
    getRelativeTime(undefined, timeRange, {
      fieldName: TIMESTAMP,
    });
  const filtersToUse = timeFilter ? [timeFilter] : [];
  const queryToUse = kuery ? { query: kuery, language: 'kuery' } : [];

  return kbnBuildEsQuery(undefined, queryToUse, filtersToUse);
}
