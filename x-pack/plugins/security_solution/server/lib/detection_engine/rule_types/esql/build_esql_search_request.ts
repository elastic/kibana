/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Filter } from '@kbn/es-query';
import type {
  RuleFilterArray,
  TimestampOverride,
} from '../../../../../common/detection_engine/rule_schema';
import { buildTimeRangeFilter } from '../utils/build_events_query';
import { getQueryFilter } from '../utils/get_query_filter';

interface BuildEqlSearchRequestParams {
  query: string;
  from: string;
  to: string;
  size: number;
  filters: RuleFilterArray | undefined;
  primaryTimestamp: TimestampOverride;
  secondaryTimestamp: TimestampOverride | undefined;
  runtimeMappings: estypes.MappingRuntimeFields | undefined;
  exceptionFilter: Filter | undefined;
}

export const buildEsqlSearchRequest = ({
  query,
  from,
  to,
  size,
  filters,
  primaryTimestamp,
  secondaryTimestamp,
  runtimeMappings,
  exceptionFilter,
}: BuildEqlSearchRequestParams) => {
  const timestamps = secondaryTimestamp
    ? [primaryTimestamp, secondaryTimestamp]
    : [primaryTimestamp];
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const esFilter = getQueryFilter({
    query: '',
    language: 'esql',
    filters: filters || [],
    index: undefined,
    exceptionFilter,
  });

  const rangeFilter = buildTimeRangeFilter({
    to,
    from,
    primaryTimestamp,
    secondaryTimestamp,
  });
  const requestFilter: estypes.QueryDslQueryContainer[] = [rangeFilter, esFilter];
  // const fields = [
  //   {
  //     field: '*',
  //     include_unmapped: true,
  //   },
  //   ...docFields,
  // ];

  return {
    query,
    filter: {
      bool: {
        filter: requestFilter,
      },
    },
  };
};
