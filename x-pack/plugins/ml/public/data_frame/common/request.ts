/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultOperator } from 'elasticsearch';

import { StaticIndexPattern } from 'ui/index_patterns';

import { dictionaryToArray } from '../../../common/types/common';

import { DefinePivotExposedState } from '../components/define_pivot/define_pivot_form';
import { JobDetailsExposedState } from '../components/job_details/job_details_form';

import { PivotGroupByConfig } from '../common';

import {
  dateHistogramIntervalFormatRegex,
  DATE_HISTOGRAM_FORMAT,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from './pivot_group_by';

import { PivotAggDict, PivotAggsConfig } from './pivot_aggs';
import { DateHistogramAgg, HistogramAgg, PivotGroupByDict, TermsAgg } from './pivot_group_by';

export interface DataFramePreviewRequest {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
  source: {
    index: string;
    query?: any;
  };
}

export interface DataFrameRequest extends DataFramePreviewRequest {
  dest: {
    index: string;
  };
}

export interface DataFrameJobConfig extends DataFrameRequest {
  id: string;
}

export interface SimpleQuery {
  query_string: {
    query: string;
    default_operator: DefaultOperator;
  };
}

export function getPivotQuery(search: string): SimpleQuery {
  return {
    query_string: {
      query: search,
      default_operator: 'AND',
    },
  };
}

export function getDataFramePreviewRequest(
  indexPatternTitle: StaticIndexPattern['title'],
  query: SimpleQuery,
  groupBy: PivotGroupByConfig[],
  aggs: PivotAggsConfig[]
): DataFramePreviewRequest {
  const request: DataFramePreviewRequest = {
    source: {
      index: indexPatternTitle,
      query,
    },
    pivot: {
      group_by: {},
      aggregations: {},
    },
  };

  groupBy.forEach(g => {
    if (g.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS) {
      const termsAgg: TermsAgg = {
        terms: {
          field: g.field,
        },
      };
      request.pivot.group_by[g.aggName] = termsAgg;
    } else if (g.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM) {
      const histogramAgg: HistogramAgg = {
        histogram: {
          field: g.field,
          interval: g.interval,
        },
      };
      request.pivot.group_by[g.aggName] = histogramAgg;
    } else if (g.agg === PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM) {
      const dateHistogramAgg: DateHistogramAgg = {
        date_histogram: {
          field: g.field,
          interval: g.interval,
        },
      };

      // DATE_HISTOGRAM_FORMAT is an enum which maps interval units like ms/s/m/... to
      // date_histrogram aggregation formats like 'yyyy-MM-dd'. The following code extracts
      // the interval unit from the configurations interval and adds a matching
      // aggregation format to the configuration.
      const timeUnitMatch = g.interval.match(dateHistogramIntervalFormatRegex);
      if (timeUnitMatch !== null && Array.isArray(timeUnitMatch) && timeUnitMatch.length === 2) {
        // the following is just a TS compatible way of using the
        // matched string like `d` as the property to access the enum.
        const format =
          DATE_HISTOGRAM_FORMAT[timeUnitMatch[1] as keyof typeof DATE_HISTOGRAM_FORMAT];
        if (format !== undefined) {
          dateHistogramAgg.date_histogram.format = format;
        }
      }
      request.pivot.group_by[g.aggName] = dateHistogramAgg;
    }
  });

  aggs.forEach(agg => {
    request.pivot.aggregations[agg.aggName] = {
      [agg.agg]: {
        field: agg.field,
      },
    };
  });

  return request;
}

export function getDataFrameRequest(
  indexPatternTitle: StaticIndexPattern['title'],
  pivotState: DefinePivotExposedState,
  jobDetailsState: JobDetailsExposedState
): DataFrameRequest {
  const request: DataFrameRequest = {
    ...getDataFramePreviewRequest(
      indexPatternTitle,
      getPivotQuery(pivotState.search),
      dictionaryToArray(pivotState.groupByList),
      dictionaryToArray(pivotState.aggList)
    ),
    dest: {
      index: jobDetailsState.targetIndex,
    },
  };

  return request;
}
