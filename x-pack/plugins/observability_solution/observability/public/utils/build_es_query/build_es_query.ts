/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEsQuery as kbnBuildEsQuery,
  EsQueryConfig,
  Filter,
  Query,
  TimeRange,
} from '@kbn/es-query';
import { ALERT_TIME_RANGE } from '@kbn/rule-data-utils';
import { getTime } from '@kbn/data-plugin/common';

interface BuildEsQueryArgs {
  timeRange?: TimeRange;
  kuery?: string;
  config?: EsQueryConfig;
  queries?: Query[];
  filters?: Filter[];
}

export function buildEsQuery({
  timeRange,
  kuery,
  config = {},
  queries = [],
  filters = [],
}: BuildEsQueryArgs) {
  const timeFilter =
    timeRange &&
    getTime(undefined, timeRange, {
      fieldName: ALERT_TIME_RANGE,
    });
  const filtersToUse: Filter[] = timeFilter ? [timeFilter, ...filters] : filters;
  const kueryFilter = kuery ? [{ query: kuery, language: 'kuery' }] : [];
  const queryToUse = [...kueryFilter, ...queries];
  return kbnBuildEsQuery(undefined, queryToUse, filtersToUse, config);
}
