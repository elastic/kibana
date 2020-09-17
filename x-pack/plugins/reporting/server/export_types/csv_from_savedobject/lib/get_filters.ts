/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import moment from 'moment-timezone';
import { TimeRangeParams } from '../../../types';
import { Filter, QueryFilter, SavedSearchObjectAttributes, SearchSourceFilter } from '../types';

export function getFilters(
  indexPatternId: string,
  indexPatternTimeField: string | null,
  timerange: TimeRangeParams | null,
  savedSearchObjectAttr: SavedSearchObjectAttributes,
  searchSourceFilter?: SearchSourceFilter,
  queryFilter?: QueryFilter
) {
  let includes: string[];
  let timeFilter: any | null;
  let timezone: string | null;

  if (indexPatternTimeField) {
    if (!timerange || timerange.min == null || timerange.max == null) {
      throw badRequest(
        `Time range params are required for index pattern [${indexPatternId}], using time field [${indexPatternTimeField}]`
      );
    }

    timezone = timerange.timezone;
    const { min: gte, max: lte } = timerange;
    timeFilter = {
      range: {
        [indexPatternTimeField]: {
          format: 'strict_date_time',
          gte: moment.tz(moment(gte), timezone).format(),
          lte: moment.tz(moment(lte), timezone).format(),
        },
      },
    };

    const savedSearchCols = savedSearchObjectAttr.columns || [];
    includes = [indexPatternTimeField, ...savedSearchCols];
  } else {
    includes = savedSearchObjectAttr.columns || [];
    timeFilter = null;
    timezone = null;
  }

  const combinedFilter: Filter[] = [timeFilter, searchSourceFilter, queryFilter].filter(Boolean); // builds an array of defined filters

  return { timezone, combinedFilter, includes };
}
