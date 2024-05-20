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
  FILTERS,
  Query,
  TimeRange,
} from '@kbn/es-query';
import { getTime } from '@kbn/data-plugin/common';
import { ALERT_TIME_RANGE, TIMESTAMP } from '@kbn/rule-data-utils';

interface BuildEsQueryArgs {
  timeRange?: TimeRange;
  kuery?: string;
  queries?: Query[];
  config?: EsQueryConfig;
  filters?: Filter[];
}

export function buildEsQuery({
  timeRange,
  kuery,
  filters = [],
  queries = [],
  config = {},
}: BuildEsQueryArgs) {
  const timeFilter: Filter | undefined = timeRange && {
    query: {
      bool: {
        minimum_should_match: 1,
        should: [
          getTime(undefined, timeRange, {
            fieldName: ALERT_TIME_RANGE,
          })?.query,
          getTime(undefined, timeRange, {
            fieldName: TIMESTAMP,
          })?.query,
        ],
      },
    },
    meta: {
      type: FILTERS.CUSTOM,
    },
  };
  const filtersToUse = [...(timeFilter ? [timeFilter] : []), ...filters];
  const kueryFilter = kuery ? [{ query: kuery, language: 'kuery' }] : [];
  const queryToUse = [...kueryFilter, ...queries];
  return kbnBuildEsQuery(undefined, queryToUse, filtersToUse, config);
}
