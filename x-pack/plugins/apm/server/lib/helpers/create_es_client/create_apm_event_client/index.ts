/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValuesType } from 'utility-types';
import { APMBaseDoc } from '../../../../../typings/es_schemas/raw/apm_base_doc';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { KibanaRequest } from '../../../../../../../../src/core/server';
import { ProcessorEvent } from '../../../../../common/processor_event';
import {
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../typings/elasticsearch';
import { ApmIndicesConfig } from '../../../settings/apm_indices/get_apm_indices';
import { APMRequestHandlerContext } from '../../../../routes/typings';
import { addFilterToExcludeLegacyData } from './add_filter_to_exclude_legacy_data';
import { callClientWithDebug } from '../call_client_with_debug';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { unpackProcessorEvents } from './unpack_processor_events';

export type APMEventESSearchRequest = Omit<ESSearchRequest, 'index'> & {
  apm: {
    events: ProcessorEvent[];
  };
};

type TypeOfProcessorEvent<T extends ProcessorEvent> = {
  [ProcessorEvent.error]: APMError;
  [ProcessorEvent.transaction]: Transaction;
  [ProcessorEvent.span]: Span;
  [ProcessorEvent.metric]: APMBaseDoc;
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
  context,
  request,
  indices,
  options: { includeFrozen } = { includeFrozen: false },
}: {
  context: APMRequestHandlerContext;
  request: KibanaRequest;
  indices: ApmIndicesConfig;
  options: {
    includeFrozen: boolean;
  };
}) {
  const client = context.core.elasticsearch.legacy.client;

  return {
    search<TParams extends APMEventESSearchRequest>(
      params: TParams,
      { includeLegacyData } = { includeLegacyData: false }
    ): Promise<TypedSearchResponse<TParams>> {
      const withProcessorEventFilter = unpackProcessorEvents(params, indices);

      const withPossibleLegacyDataFilter = !includeLegacyData
        ? addFilterToExcludeLegacyData(withProcessorEventFilter)
        : withProcessorEventFilter;

      return callClientWithDebug({
        apiCaller: client.callAsCurrentUser,
        operationName: 'search',
        params: {
          ...withPossibleLegacyDataFilter,
          ignore_throttled: !includeFrozen,
        },
        request,
        debug: context.params.query._debug,
      });
    },
  };
}
