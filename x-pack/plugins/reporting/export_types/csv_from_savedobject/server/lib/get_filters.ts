/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import {
  SavedSearchObjectAttributes,
  TimeRangeParams,
} from '../../';
import {
  QueryFilter,
  Filter,
  SearchSourceFilter,
} from './';

export function getFilters (
  indexPatternTimeField: string,
  timerange: TimeRangeParams,
  savedSearchObjectAttr: SavedSearchObjectAttributes,
  searchSourceFilter: SearchSourceFilter,
  queryFilter: QueryFilter
) {
  let includes: string[];
  let timeFilter: any | null;
  let timezone: string | null;

  if (indexPatternTimeField) {
    const savedSearchCols = savedSearchObjectAttr.columns || [];
    includes = [indexPatternTimeField, ...savedSearchCols];
    timeFilter = {
      range: {
        [indexPatternTimeField]: {
          format: 'epoch_millis',
          gte: moment(timerange.min).valueOf(),
          lte: moment(timerange.max).valueOf(),
        },
      },
    };
    timezone = timerange.timezone;
  } else {
    includes = savedSearchObjectAttr.columns || [];
    timeFilter = null;
    timezone = null;
  }

  const combinedFilter: Filter[] = [timeFilter, searchSourceFilter, queryFilter].filter(Boolean); // builds an array of defined filters

  return { combinedFilter, includes, timezone };
}
