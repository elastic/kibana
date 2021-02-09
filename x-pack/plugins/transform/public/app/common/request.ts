/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultOperator } from 'elasticsearch';

import { HttpFetchError } from '../../../../../../src/core/public';
import type { IndexPattern } from '../../../../../../src/plugins/data/public';

import type {
  PostTransformsPreviewRequestSchema,
  PutTransformsLatestRequestSchema,
  PutTransformsPivotRequestSchema,
  PutTransformsRequestSchema,
} from '../../../common/api_schemas/transforms';

import type { SavedSearchQuery } from '../hooks/use_search_items';
import type { StepDefineExposedState } from '../sections/create_transform/components/step_define';
import type { StepDetailsExposedState } from '../sections/create_transform/components/step_details/step_details_form';

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
  partialRequest?: StepDefineExposedState['previewRequest'] | undefined
): PostTransformsPreviewRequestSchema {
  const index = indexPatternTitle.split(',').map((name: string) => name.trim());

  return {
    source: {
      index,
      ...(!isDefaultQuery(query) && !isMatchAllQuery(query) ? { query } : {}),
    },
    ...(partialRequest ?? {}),
  };
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
): PutTransformsPivotRequestSchema | PutTransformsLatestRequestSchema => ({
  ...getPreviewTransformRequestBody(
    indexPatternTitle,
    getPivotQuery(pivotState.searchQuery),
    pivotState.previewRequest
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
