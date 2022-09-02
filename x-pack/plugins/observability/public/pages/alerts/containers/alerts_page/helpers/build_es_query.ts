/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery as kbnBuildEsQuery, TimeRange } from '@kbn/es-query';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { getTime } from '@kbn/data-plugin/common';

export function buildEsQuery(timeRange: TimeRange, kuery: string) {
  const timeFilter =
    timeRange &&
    getTime(undefined, timeRange, {
      fieldName: TIMESTAMP,
    });
  const filtersToUse = [...(timeFilter ? [timeFilter] : [])];

  return kbnBuildEsQuery(undefined, { query: kuery, language: 'kuery' }, filtersToUse);
}
