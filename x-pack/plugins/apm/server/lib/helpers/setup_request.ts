/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import {
  PROCESSOR_EVENT,
  TRANSACTION_DURATION_HISTOGRAM
} from '../../../common/elasticsearch_fieldnames';
import { KibanaRequest } from '../../../../../../src/core/server';
import { IIndexPattern } from '../../../../../../src/plugins/data/common';
import { APMConfig } from '../..';
import {
  getApmIndices,
  ApmIndicesConfig
} from '../settings/apm_indices/get_apm_indices';
import { ESFilter } from '../../../typings/elasticsearch';
import { ESClient } from './es_client';
import { getUiFiltersES } from './convert_ui_filters/get_ui_filters_es';
import { APMRequestHandlerContext } from '../../routes/typings';
import { getESClient } from './es_client';
import { ProcessorEvent } from '../../../common/processor_event';
import { getDynamicIndexPattern } from '../index_pattern/get_dynamic_index_pattern';
import { rangeFilter } from './range_filter';

function decodeUiFilters(
  indexPattern: IIndexPattern | undefined,
  uiFiltersEncoded?: string
) {
  if (!uiFiltersEncoded || !indexPattern) {
    return [];
  }
  const uiFilters = JSON.parse(uiFiltersEncoded);
  return getUiFiltersES(indexPattern, uiFilters);
}
// Explicitly type Setup to prevent TS initialization errors
// https://github.com/microsoft/TypeScript/issues/34933

export interface Setup {
  client: ESClient;
  internalClient: ESClient;
  config: APMConfig;
  indices: ApmIndicesConfig;
  dynamicIndexPattern?: IIndexPattern;
}

export interface SetupTimeRange {
  start: number;
  end: number;
}

export interface SetupUIFilters {
  uiFiltersES: ESFilter[];
}

export interface SetupHasTransactionDurationMetrics {
  hasTransactionDurationMetrics: boolean;
}

interface SetupRequestParams {
  query?: {
    _debug?: boolean;
    start?: string;
    end?: string;
    uiFilters?: string;
    processorEvent?: ProcessorEvent;
  };
}

interface SetupRequestOptions {
  checkForTransactionDurationMetrics: boolean;
}

type InferSetup<
  TParams extends SetupRequestParams,
  TOptions extends SetupRequestOptions
> = Setup &
  (TParams extends { query: { start: string } } ? { start: number } : {}) &
  (TParams extends { query: { end: string } } ? { end: number } : {}) &
  (TParams extends { query: { uiFilters: string } }
    ? { uiFiltersES: ESFilter[] }
    : {}) &
  (TOptions extends { checkForTransactionDurationMetrics: true }
    ? { hasTransactionDurationMetrics: boolean }
    : {});

export async function setupRequest<
  TParams extends SetupRequestParams,
  TOptions extends SetupRequestOptions
>(
  context: APMRequestHandlerContext<TParams>,
  request: KibanaRequest,
  options?: TOptions
): Promise<InferSetup<TParams, TOptions>> {
  const { config } = context;
  const { query } = context.params;

  const indices = await getApmIndices({
    savedObjectsClient: context.core.savedObjects.client,
    config
  });

  const client = getESClient(context, request, { clientAsInternalUser: false });

  const start =
    'start' in query ? { start: moment.utc(query.start).valueOf() } : {};
  const end = 'end' in query ? { end: moment.utc(query.end).valueOf() } : {};

  const checkTransactionDurationMetrics = async () => {
    const response = await client.search({
      index: indices['apm_oss.metricsIndices'],
      body: {
        query: {
          bool: {
            filter: [
              { term: { [PROCESSOR_EVENT]: 'metric' } },
              ...(start.start && end.end
                ? [{ range: rangeFilter(start.start, end.end) }]
                : []),
              { exists: { field: TRANSACTION_DURATION_HISTOGRAM } }
            ]
          }
        },
        size: 0
      },
      terminateAfter: 1
    });

    return {
      hasTransactionDurationMetrics: response.hits.total.value > 0
    };
  };

  const [
    dynamicIndexPattern,
    hasTransactionDurationMetrics
  ] = await Promise.all([
    getDynamicIndexPattern({
      context,
      indices,
      processorEvent: query.processorEvent
    }),
    options?.checkForTransactionDurationMetrics
      ? checkTransactionDurationMetrics()
      : Promise.resolve({})
  ]);

  const uiFiltersES = decodeUiFilters(dynamicIndexPattern, query.uiFilters);

  const coreSetupRequest = {
    indices,
    client,
    internalClient: getESClient(context, request, {
      clientAsInternalUser: true
    }),
    config,
    dynamicIndexPattern
  };

  return {
    ...start,
    ...end,
    ...hasTransactionDurationMetrics,
    ...('uiFilters' in query ? { uiFiltersES } : {}),
    ...coreSetupRequest
  } as InferSetup<TParams, TOptions>;
}
