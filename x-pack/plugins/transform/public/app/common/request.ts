/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { DefaultOperator } from 'elasticsearch';

import { HttpFetchError } from '../../../../../../src/core/public';
import type { IndexPattern } from '../../../../../../src/plugins/data/public';

import type {
  PostTransformsPreviewRequestSchema,
  PutTransformsRequestSchema,
} from '../../../common/api_schemas/transforms';
import type {
  DateHistogramAgg,
  HistogramAgg,
  TermsAgg,
} from '../../../common/types/pivot_group_by';
import { dictionaryToArray } from '../../../common/types/common';

import type { SavedSearchQuery } from '../hooks/use_search_items';
import type { StepDefineExposedState } from '../sections/create_transform/components/step_define';
import type { StepDetailsExposedState } from '../sections/create_transform/components/step_details/step_details_form';

import {
  getEsAggFromAggConfig,
  getEsAggFromGroupByConfig,
  isGroupByDateHistogram,
  isGroupByHistogram,
  isGroupByTerms,
  PivotGroupByConfig,
} from '../common';

import { PivotAggsConfig } from './pivot_aggs';

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

export function getPreviewTransformRequestBody(
  indexPatternTitle: IndexPattern['title'],
  query: PivotQuery,
  groupBy: PivotGroupByConfig[],
  aggs: PivotAggsConfig[]
): PostTransformsPreviewRequestSchema {
  const index = indexPatternTitle.split(',').map((name: string) => name.trim());

  const request: PostTransformsPreviewRequestSchema = {
    source: {
      index,
      ...(!isDefaultQuery(query) && !isMatchAllQuery(query) ? { query } : {}),
    },
    pivot: {
      group_by: {},
      aggregations: {},
    },
  };

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

export const getCreateTransformSettingsRequestBody = (
  transformDetailsState: Partial<StepDetailsExposedState>
): { settings?: PutTransformsRequestSchema['settings'] } => {
  const settings: PutTransformsRequestSchema['settings'] = {
    ...(transformDetailsState.transformSettingsMaxPageSearchSize
      ? { max_page_search_size: transformDetailsState.transformSettingsMaxPageSearchSize }
      : {}),
    ...(transformDetailsState.transformSettingsDocsPerSecond
      ? { docs_per_second: transformDetailsState.transformSettingsDocsPerSecond }
      : {}),
  };
  return Object.keys(settings).length > 0 ? { settings } : {};
};

export const getCreateTransformRequestBody = (
  indexPatternTitle: IndexPattern['title'],
  pivotState: StepDefineExposedState,
  transformDetailsState: StepDetailsExposedState
): PutTransformsRequestSchema => ({
  ...getPreviewTransformRequestBody(
    indexPatternTitle,
    getPivotQuery(pivotState.searchQuery),
    dictionaryToArray(pivotState.groupByList),
    dictionaryToArray(pivotState.aggList)
  ),
  // conditionally add optional description
  ...(transformDetailsState.transformDescription !== ''
    ? { description: transformDetailsState.transformDescription }
    : {}),
  // conditionally add optional frequency
  ...(transformDetailsState.transformFrequency !== ''
    ? { frequency: transformDetailsState.transformFrequency }
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
  // conditionally add additional settings
  ...getCreateTransformSettingsRequestBody(transformDetailsState),
});

export function isHttpFetchError(error: any): error is HttpFetchError {
  return (
    error instanceof HttpFetchError &&
    typeof error.name === 'string' &&
    typeof error.message !== 'undefined'
  );
}
