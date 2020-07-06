/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultOperator } from 'elasticsearch';

import { dictionaryToArray } from '../../../common/types/common';
import { SavedSearchQuery } from '../hooks/use_search_items';

import { StepDefineExposedState } from '../sections/create_transform/components/step_define';
import { StepDetailsExposedState } from '../sections/create_transform/components/step_details/step_details_form';

import { IndexPattern } from '../../../../../../src/plugins/data/public';

import {
  getEsAggFromAggConfig,
  getEsAggFromGroupByConfig,
  isGroupByDateHistogram,
  isGroupByHistogram,
  isGroupByTerms,
  PivotGroupByConfig,
} from '../common';

import { PivotAggsConfig } from './pivot_aggs';
import { DateHistogramAgg, HistogramAgg, TermsAgg } from './pivot_group_by';
import { PreviewRequestBody, CreateRequestBody } from './transform';

export interface SimpleQuery {
  query_string: {
    query: string;
    default_operator?: DefaultOperator;
  };
}

export type PivotQuery = SimpleQuery | SavedSearchQuery;

export function getPivotQuery(search: string | SavedSearchQuery): PivotQuery {
  if (typeof search === 'string') {
    return {
      query_string: {
        query: search,
        default_operator: 'AND',
      },
    };
  }

  return search;
}

export function isSimpleQuery(arg: any): arg is SimpleQuery {
  return arg.query_string !== undefined;
}

export const matchAllQuery = { match_all: {} };
export function isMatchAllQuery(query: any): boolean {
  return query.match_all !== undefined && Object.keys(query.match_all).length === 0;
}

export const defaultQuery: PivotQuery = { query_string: { query: '*' } };
export function isDefaultQuery(query: PivotQuery): boolean {
  return isSimpleQuery(query) && query.query_string.query === '*';
}

export function getPreviewRequestBody(
  indexPatternTitle: IndexPattern['title'],
  query: PivotQuery,
  groupBy: PivotGroupByConfig[],
  aggs: PivotAggsConfig[]
): PreviewRequestBody {
  const index = indexPatternTitle.split(',').map((name: string) => name.trim());

  const request: PreviewRequestBody = {
    source: {
      index,
    },
    pivot: {
      group_by: {},
      aggregations: {},
    },
  };

  if (!isDefaultQuery(query) && !isMatchAllQuery(query)) {
    request.source.query = query;
  }

  groupBy.forEach((g) => {
    if (isGroupByTerms(g)) {
      const termsAgg: TermsAgg = {
        terms: {
          field: g.field,
        },
      };
      request.pivot.group_by[g.aggName] = termsAgg;
    } else if (isGroupByHistogram(g)) {
      const histogramAgg: HistogramAgg = {
        histogram: {
          field: g.field,
          interval: g.interval,
        },
      };
      request.pivot.group_by[g.aggName] = histogramAgg;
    } else if (isGroupByDateHistogram(g)) {
      const dateHistogramAgg: DateHistogramAgg = {
        date_histogram: {
          field: g.field,
          calendar_interval: g.calendar_interval,
        },
      };
      request.pivot.group_by[g.aggName] = dateHistogramAgg;
    } else {
      request.pivot.group_by[g.aggName] = getEsAggFromGroupByConfig(g);
    }
  });

  aggs.forEach((agg) => {
    const result = getEsAggFromAggConfig(agg);
    if (result === null) {
      return;
    }
    request.pivot.aggregations[agg.aggName] = result;
  });

  return request;
}

export function getCreateRequestBody(
  indexPatternTitle: IndexPattern['title'],
  pivotState: StepDefineExposedState,
  transformDetailsState: StepDetailsExposedState
): CreateRequestBody {
  const request: CreateRequestBody = {
    ...getPreviewRequestBody(
      indexPatternTitle,
      getPivotQuery(pivotState.searchQuery),
      dictionaryToArray(pivotState.groupByList),
      dictionaryToArray(pivotState.aggList)
    ),
    // conditionally add optional description
    ...(transformDetailsState.transformDescription !== ''
      ? { description: transformDetailsState.transformDescription }
      : {}),
    dest: {
      index: transformDetailsState.destinationIndex,
    },
    // conditionally add continuous mode config
    ...(transformDetailsState.isContinuousModeEnabled
      ? {
          sync: {
            time: {
              field: transformDetailsState.continuousModeDateField,
              delay: transformDetailsState.continuousModeDelay,
            },
          },
        }
      : {}),
  };

  return request;
}
