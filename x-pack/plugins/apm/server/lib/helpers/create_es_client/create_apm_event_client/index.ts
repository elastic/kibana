/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaultsDeep, uniq } from 'lodash';
import { ValuesType } from 'utility-types';
import { PROCESSOR_EVENT } from '../../../../../common/elasticsearch_fieldnames';
import { APMBaseDoc } from '../../../../../typings/es_schemas/raw/apm_base_doc';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { KibanaRequest } from '../../../../../../../../src/core/server';
import { ProcessorEvent } from '../../../../../common/processor_event';
import {
  ESFilter,
  ESSearchRequest,
  ESSearchResponse,
} from '../../../../../typings/elasticsearch';
import {
  ApmIndicesConfig,
  ApmIndicesName,
} from '../../../settings/apm_indices/get_apm_indices';
import { APMRequestHandlerContext } from '../../../../routes/typings';
import { addFilterForLegacyData } from './add_filter_for_legacy_data';
import { callClientWithDebug } from '../call_client_with_debug';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { Span } from '../../../../../typings/es_schemas/ui/span';

export type APMEventESSearchRequest = Omit<ESSearchRequest, 'index'> & {
  apm: {
    events: ProcessorEvent[];
  };
};

export const processorEventIndexMap: Record<ProcessorEvent, ApmIndicesName> = {
  [ProcessorEvent.transaction]: 'apm_oss.transactionIndices',
  [ProcessorEvent.span]: 'apm_oss.spanIndices',
  [ProcessorEvent.metric]: 'apm_oss.metricsIndices',
  [ProcessorEvent.error]: 'apm_oss.errorIndices',
  [ProcessorEvent.sourcemap]: 'apm_oss.sourcemapIndices',
  [ProcessorEvent.onboarding]: 'apm_oss.onboardingIndices',
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
      const { apm, ...esParams } = params;

      const index = uniq(
        apm.events.map((event) => indices[processorEventIndexMap[event]])
      );

      const nextParams: ESSearchRequest & {
        body: { query: { bool: { filter: ESFilter[] } } };
      } = defaultsDeep(esParams, {
        body: {
          query: {
            bool: {
              filter: [],
            },
          },
        },
      });

      nextParams.body.query.bool.filter.push({
        terms: {
          [PROCESSOR_EVENT]: apm.events,
        },
      });

      const withLegacyData = addFilterForLegacyData(nextParams, {
        includeLegacyData,
      });

      return callClientWithDebug({
        apiCaller: client.callAsCurrentUser,
        operationName: 'search',
        params: {
          ...withLegacyData,
          index,
          ignore_throttled: !includeFrozen,
        },
        request,
        debug: context.params.query._debug,
      });
    },
  };
}
