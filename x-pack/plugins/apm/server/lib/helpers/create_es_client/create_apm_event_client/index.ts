/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TermsEnumRequest,
  TermsEnumResponse,
} from '@elastic/elasticsearch/api/types';
import { ValuesType } from 'utility-types';
import { withApmSpan } from '../../../../utils/with_apm_span';
import { Profile } from '../../../../../typings/es_schemas/ui/profile';
import {
  ElasticsearchClient,
  KibanaRequest,
} from '../../../../../../../../src/core/server';
import {
  ESSearchRequest,
  InferSearchResponseOf,
} from '../../../../../../../../src/core/types/elasticsearch';
import { unwrapEsResponse } from '../../../../../../observability/server';
import { ProcessorEvent } from '../../../../../common/processor_event';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { Metric } from '../../../../../typings/es_schemas/ui/metric';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { ApmIndicesConfig } from '../../../settings/apm_indices/get_apm_indices';
import {
  callAsyncWithDebug,
  getDebugBody,
  getDebugTitle,
} from '../call_async_with_debug';
import { cancelEsRequestOnAbort } from '../cancel_es_request_on_abort';
import { addFilterToExcludeLegacyData } from './add_filter_to_exclude_legacy_data';
import { unpackProcessorEvents } from './unpack_processor_events';

export type APMEventESSearchRequest = Omit<ESSearchRequest, 'index'> & {
  apm: {
    events: ProcessorEvent[];
    includeLegacyData?: boolean;
  };
};

export type APMEventESTermsEnumRequest = Omit<TermsEnumRequest, 'index'> & {
  apm: { events: ProcessorEvent[] };
};

// These keys shoul all be `ProcessorEvent.x`, but until TypeScript 4.2 we're inlining them here.
// See https://github.com/microsoft/TypeScript/issues/37888
type TypeOfProcessorEvent<T extends ProcessorEvent> = {
  error: APMError;
  transaction: Transaction;
  span: Span;
  metric: Metric;
  profile: Profile;
}[T];

type ESSearchRequestOf<TParams extends APMEventESSearchRequest> = Omit<
  TParams,
  'apm'
> & { index: string[] | string };

type TypedSearchResponse<TParams extends APMEventESSearchRequest> =
  InferSearchResponseOf<
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
      operationName: string,
      params: TParams
    ): Promise<TypedSearchResponse<TParams>> {
      const withProcessorEventFilter = unpackProcessorEvents(params, indices);

      const { includeLegacyData = false } = params.apm;

      const withPossibleLegacyDataFilter = !includeLegacyData
        ? addFilterToExcludeLegacyData(withProcessorEventFilter)
        : withProcessorEventFilter;

      const searchParams = {
        ...withPossibleLegacyDataFilter,
        ignore_throttled: !includeFrozen,
        ignore_unavailable: true,
        preference: 'any',
      };

      // only "search" operation is currently supported
      const requestType = 'search';

      return callAsyncWithDebug({
        cb: () => {
          const searchPromise = withApmSpan(operationName, () =>
            cancelEsRequestOnAbort(esClient.search(searchParams), request)
          );

          return unwrapEsResponse(searchPromise);
        },
        getDebugMessage: () => ({
          body: getDebugBody({
            params: searchParams,
            requestType,
            operationName,
          }),
          title: getDebugTitle(request),
        }),
        isCalledWithInternalUser: false,
        debug,
        request,
        requestType,
        operationName,
        requestParams: searchParams,
      });
    },

    async termsEnum(
      operationName: string,
      params: APMEventESTermsEnumRequest
    ): Promise<TermsEnumResponse> {
      const requestType = 'terms_enum';
      const { index } = unpackProcessorEvents(params, indices);

      return callAsyncWithDebug({
        cb: () => {
          const { apm, ...rest } = params;
          const termsEnumPromise = withApmSpan(operationName, () =>
            cancelEsRequestOnAbort(
              esClient.termsEnum({
                index: Array.isArray(index) ? index.join(',') : index,
                ...rest,
              }),
              request
            )
          );

          return unwrapEsResponse(termsEnumPromise);
        },
        getDebugMessage: () => ({
          body: getDebugBody({
            params,
            requestType,
            operationName,
          }),
          title: getDebugTitle(request),
        }),
        isCalledWithInternalUser: false,
        debug,
        request,
        requestType,
        operationName,
        requestParams: params,
      });
    },
  };
}
