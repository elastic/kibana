/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { buildBaseFilterCriteria } from '@kbn/ml-query-utils';

import {
  DEFAULT_CONTINUOUS_MODE_DELAY,
  DEFAULT_TRANSFORM_FREQUENCY,
  DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND,
  DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE,
} from '../../../common/constants';
import type {
  PivotTransformPreviewRequestSchema,
  PostTransformsPreviewRequestSchema,
  PutTransformsLatestRequestSchema,
  PutTransformsPivotRequestSchema,
  PutTransformsRequestSchema,
} from '../../../common/api_schemas/transforms';
import { DateHistogramAgg, HistogramAgg, TermsAgg } from '../../../common/types/pivot_group_by';
import { isDataView } from '../../../common/types/data_view';

import type { SavedSearchQuery } from '../hooks/use_search_items';
import type { StepDefineExposedState } from '../sections/create_transform/components/step_define';
import type { StepDetailsExposedState } from '../sections/create_transform/components/step_details';

import {
  getEsAggFromAggConfig,
  getEsAggFromGroupByConfig,
  isGroupByDateHistogram,
  isGroupByHistogram,
  isGroupByTerms,
  GroupByConfigWithUiSupport,
  PivotAggsConfig,
  PivotGroupByConfig,
} from '.';

export interface SimpleQuery {
  query_string: {
    query: string;
    default_operator?: estypes.QueryDslOperator;
  };
}

export interface FilterBasedSimpleQuery {
  bool: {
    filter: [SimpleQuery];
  };
}

export type TransformConfigQuery = FilterBasedSimpleQuery | SimpleQuery | SavedSearchQuery;

export function getTransformConfigQuery(search: string | SavedSearchQuery): TransformConfigQuery {
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

export function isSimpleQuery(arg: unknown): arg is SimpleQuery {
  return isPopulatedObject(arg, ['query_string']);
}

export function isFilterBasedSimpleQuery(arg: unknown): arg is FilterBasedSimpleQuery {
  return (
    isPopulatedObject(arg, ['bool']) &&
    isPopulatedObject(arg.bool, ['filter']) &&
    Array.isArray(arg.bool.filter) &&
    arg.bool.filter.length === 1 &&
    isSimpleQuery(arg.bool.filter[0])
  );
}

export const matchAllQuery = { match_all: {} };
export function isMatchAllQuery(query: unknown): boolean {
  return (
    isPopulatedObject(query, ['match_all']) &&
    typeof query.match_all === 'object' &&
    query.match_all !== null &&
    Object.keys(query.match_all).length === 0
  );
}

export const defaultQuery: TransformConfigQuery = { query_string: { query: '*' } };
export function isDefaultQuery(query: TransformConfigQuery): boolean {
  return (
    (isSimpleQuery(query) && query.query_string.query === '*') ||
    (isFilterBasedSimpleQuery(query) && query.bool.filter[0].query_string.query === '*')
  );
}

export function getCombinedRuntimeMappings(
  dataView: DataView | undefined,
  runtimeMappings?: StepDefineExposedState['runtimeMappings']
): StepDefineExposedState['runtimeMappings'] | undefined {
  let combinedRuntimeMappings = {};

  // And runtime field mappings defined by index pattern
  if (isDataView(dataView)) {
    const computedFields = dataView.getComputedFields();
    if (computedFields?.runtimeFields !== undefined) {
      const ipRuntimeMappings = computedFields.runtimeFields;
      if (isPopulatedObject(ipRuntimeMappings)) {
        combinedRuntimeMappings = { ...combinedRuntimeMappings, ...ipRuntimeMappings };
      }
    }
  }

  // Use runtime field mappings defined inline from API
  // and override fields with same name from index pattern
  if (isPopulatedObject(runtimeMappings)) {
    combinedRuntimeMappings = { ...combinedRuntimeMappings, ...runtimeMappings };
  }

  if (isPopulatedObject<keyof StepDefineExposedState['runtimeMappings']>(combinedRuntimeMappings)) {
    return combinedRuntimeMappings;
  }
  return undefined;
}

export const getMissingBucketConfig = (
  g: GroupByConfigWithUiSupport
): { missing_bucket?: boolean } => {
  return g.missing_bucket !== undefined ? { missing_bucket: g.missing_bucket } : {};
};

export const getRequestPayload = (
  pivotAggsArr: PivotAggsConfig[],
  pivotGroupByArr: PivotGroupByConfig[]
) => {
  const request = {
    pivot: {
      group_by: {},
      aggregations: {},
    } as PivotTransformPreviewRequestSchema['pivot'],
  };

  pivotGroupByArr.forEach((g) => {
    if (isGroupByTerms(g)) {
      const termsAgg: TermsAgg = {
        terms: {
          field: g.field,
          ...getMissingBucketConfig(g),
        },
      };
      request.pivot.group_by[g.aggName] = termsAgg;
    } else if (isGroupByHistogram(g)) {
      const histogramAgg: HistogramAgg = {
        histogram: {
          field: g.field,
          interval: g.interval,
          ...getMissingBucketConfig(g),
        },
      };
      request.pivot.group_by[g.aggName] = histogramAgg;
    } else if (isGroupByDateHistogram(g)) {
      const dateHistogramAgg: DateHistogramAgg = {
        date_histogram: {
          field: g.field,
          calendar_interval: g.calendar_interval,
          ...getMissingBucketConfig(g),
        },
      };
      request.pivot.group_by[g.aggName] = dateHistogramAgg;
    } else {
      request.pivot.group_by[g.aggName] = getEsAggFromGroupByConfig(g);
    }
  });

  pivotAggsArr.forEach((agg) => {
    const result = getEsAggFromAggConfig(agg);
    if (result === null) {
      return;
    }
    request.pivot.aggregations[agg.aggName] = result;
  });

  return request;
};

export function getPreviewTransformRequestBody(
  dataView: DataView,
  transformConfigQuery: TransformConfigQuery,
  partialRequest?: StepDefineExposedState['previewRequest'],
  runtimeMappings?: StepDefineExposedState['runtimeMappings'],
  timeRangeMs?: StepDefineExposedState['timeRangeMs']
): PostTransformsPreviewRequestSchema {
  const dataViewTitle = dataView.getIndexPattern();
  const index = dataViewTitle.split(',').map((name: string) => name.trim());

  const hasValidTimeField = dataView.timeFieldName !== undefined && dataView.timeFieldName !== '';

  const baseFilterCriteria = buildBaseFilterCriteria(
    dataView.timeFieldName,
    timeRangeMs?.from,
    timeRangeMs?.to,
    transformConfigQuery
  );

  const queryWithBaseFilterCriteria = {
    bool: {
      filter: baseFilterCriteria,
    },
  };

  const query = hasValidTimeField ? queryWithBaseFilterCriteria : matchAllQuery;

  return {
    source: {
      index,
      ...(isDefaultQuery(query) ? {} : { query }),
      ...(isPopulatedObject(runtimeMappings) ? { runtime_mappings: runtimeMappings } : {}),
    },
    ...(partialRequest ?? {}),
  };
}

export const getCreateTransformSettingsRequestBody = (
  transformDetailsState: Partial<StepDetailsExposedState>
): { settings?: PutTransformsRequestSchema['settings'] } => {
  const settings: PutTransformsRequestSchema['settings'] = {
    // conditionally add optional max_page_search_size, skip if default value
    ...(transformDetailsState.transformSettingsMaxPageSearchSize &&
    transformDetailsState.transformSettingsMaxPageSearchSize !==
      DEFAULT_TRANSFORM_SETTINGS_MAX_PAGE_SEARCH_SIZE
      ? { max_page_search_size: transformDetailsState.transformSettingsMaxPageSearchSize }
      : {}),
    // conditionally add optional docs_per_second, skip if default value
    ...(transformDetailsState.transformSettingsDocsPerSecond &&
    transformDetailsState.transformSettingsDocsPerSecond !==
      DEFAULT_TRANSFORM_SETTINGS_DOCS_PER_SECOND
      ? { docs_per_second: transformDetailsState.transformSettingsDocsPerSecond }
      : {}),
    ...(typeof transformDetailsState.transformSettingsNumFailureRetries === 'number'
      ? { num_failure_retries: transformDetailsState.transformSettingsNumFailureRetries }
      : {}),
  };
  return Object.keys(settings).length > 0 ? { settings } : {};
};

export const getCreateTransformRequestBody = (
  dataView: DataView,
  transformConfigState: StepDefineExposedState,
  transformDetailsState: StepDetailsExposedState
): PutTransformsPivotRequestSchema | PutTransformsLatestRequestSchema => ({
  ...getPreviewTransformRequestBody(
    dataView,
    getTransformConfigQuery(transformConfigState.searchQuery),
    transformConfigState.previewRequest,
    transformConfigState.runtimeMappings
  ),
  // conditionally add optional description
  ...(transformDetailsState.transformDescription !== ''
    ? { description: transformDetailsState.transformDescription }
    : {}),
  // conditionally add optional frequency, skip if default value
  ...(transformDetailsState.transformFrequency !== '' &&
  transformDetailsState.transformFrequency !== DEFAULT_TRANSFORM_FREQUENCY
    ? { frequency: transformDetailsState.transformFrequency }
    : {}),
  dest: {
    index: transformDetailsState.destinationIndex,
    // conditionally add optional ingest pipeline
    ...(transformDetailsState.destinationIngestPipeline !== ''
      ? { pipeline: transformDetailsState.destinationIngestPipeline }
      : {}),
  },
  // conditionally add continuous mode config
  ...(transformDetailsState.isContinuousModeEnabled
    ? {
        sync: {
          time: {
            // conditionally add continuous mode delay, skip if default value
            ...(transformDetailsState.continuousModeDelay !== DEFAULT_CONTINUOUS_MODE_DELAY
              ? { delay: transformDetailsState.continuousModeDelay }
              : {}),
            field: transformDetailsState.continuousModeDateField,
          },
        },
      }
    : {}),
  // conditionally add retention policy settings
  ...(transformDetailsState.isRetentionPolicyEnabled
    ? {
        retention_policy: {
          time: {
            field: transformDetailsState.retentionPolicyDateField,
            max_age: transformDetailsState.retentionPolicyMaxAge,
          },
        },
      }
    : {}),
  ...(transformDetailsState._meta ? { _meta: transformDetailsState._meta } : {}),
  // conditionally add additional settings
  ...getCreateTransformSettingsRequestBody(transformDetailsState),
});
