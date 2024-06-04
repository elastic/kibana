/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter } from '@kbn/es-query';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import type {
  RuleFilterArray,
  TimestampOverride,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import { buildTimeRangeFilter } from '../utils/build_events_query';
import { getQueryFilter } from '../utils/get_query_filter';

export interface BuildEqlSearchRequestParams {
  query: string;
  from: string;
  to: string;
  size: number;
  filters: RuleFilterArray | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  exceptionFilter: Filter | undefined;
  dataViews: DataViewsContract;
}

export const buildEsqlSearchRequest = async ({
  query,
  from,
  to,
  filters,
  primaryTimestamp,
  secondaryTimestamp,
  exceptionFilter,
  size,
  dataViews,
}: BuildEqlSearchRequestParams) => {
  const esFilter = await getQueryFilter(
    {
      query: '',
      language: 'esql',
      filters: filters || [],
      index: undefined,
      exceptionFilter,
    },
    dataViews
  );

  const rangeFilter = buildTimeRangeFilter({
    to,
    from,
    primaryTimestamp,
    secondaryTimestamp,
  });

  const requestFilter: estypes.QueryDslQueryContainer[] = [rangeFilter, esFilter];

  return {
    // we limit size of the response to maxAlertNumber + 1
    // ES|QL currently does not support pagination and returns 10,000 results
    query: `${query} | limit ${size + 1}`,
    filter: {
      bool: {
        filter: requestFilter,
      },
    },
  };
};
