/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValuesType } from 'utility-types';
import { unwrapEsResponse } from '../../../../../../observability/server';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import {
  ElasticsearchClient,
  KibanaRequest,
} from '../../../../../../../../src/core/server';
import { ProcessorEvent } from '../../../../../common/processor_event';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../../../typings/elasticsearch';
import { ApmIndicesConfig } from '../../../settings/apm_indices/get_apm_indices';
import { addFilterToExcludeLegacyData } from './add_filter_to_exclude_legacy_data';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { Metric } from '../../../../../typings/es_schemas/ui/metric';
import { unpackProcessorEvents } from './unpack_processor_events';
import {
  callAsyncWithDebug,
  getDebugTitle,
  getDebugBody,
} from '../call_async_with_debug';
import { cancelEsRequestOnAbort } from '../cancel_es_request_on_abort';

export type APMEventESSearchRequest = Omit<ESSearchRequest, 'index'> & {
  apm: {
    events: ProcessorEvent[];
  };
};

type TypeOfProcessorEvent<T extends ProcessorEvent> = {
  [ProcessorEvent.error]: APMError;
  [ProcessorEvent.transaction]: Transaction;
  [ProcessorEvent.span]: Span;
  [ProcessorEvent.metric]: Metric;
  [ProcessorEvent.onboarding]: unknown;
  [ProcessorEvent.sourcemap]: unknown;
}[T];

type ESSearchRequestOf<TParams extends APMEventESSearchRequest> = Omit<
  TParams,
  'apm'
> & { index: string[] | string };

type TypedSearchResponse<
  TParams extends APMEventESSearchRequest
> = ESSearchResponse<
  TypeOfProcessorEvent<ValuesType<TParams['apm']['events']>>,
  ESSearchRequestOf<TParams>
>;

export type APMEventClient = ReturnType<typeof createApmEventClient>;

export function createApmEventClient({
  esClient,
  debug,
  request,
  indices,
  options: { includeFrozen } = { includeFrozen: false },
}: {
  esClient: ElasticsearchClient;
  debug: boolean;
  request: KibanaRequest;
  indices: ApmIndicesConfig;
  options: {
    includeFrozen: boolean;
  };
}) {
  return {
    async search<TParams extends APMEventESSearchRequest>(
      params: TParams,
      { includeLegacyData = false } = {}
    ): Promise<TypedSearchResponse<TParams>> {
      const withProcessorEventFilter = unpackProcessorEvents(params, indices);

      const withPossibleLegacyDataFilter = !includeLegacyData
        ? addFilterToExcludeLegacyData(withProcessorEventFilter)
        : withProcessorEventFilter;

      const searchParams = {
        ...withPossibleLegacyDataFilter,
        ignore_throttled: !includeFrozen,
        ignore_unavailable: true,
      };

      return callAsyncWithDebug({
        cb: () => {
          const searchPromise = cancelEsRequestOnAbort(
            esClient.search(searchParams),
            request
          );

          return unwrapEsResponse(searchPromise);
        },
        getDebugMessage: () => ({
          body: getDebugBody(searchParams, 'search'),
          title: getDebugTitle(request),
        }),
        debug,
      });
    },
  };
}
