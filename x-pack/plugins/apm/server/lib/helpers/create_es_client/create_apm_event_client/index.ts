/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ValuesType } from 'utility-types';
import apm from 'elastic-apm-node';
import { last } from 'lodash';
import { unwrapEsResponse } from '../../../../../../observability/server';
import { PromiseReturnType } from '../../../../../../observability/typings/common';
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
import { EventOutcome } from '../../../../../common/event_outcome';
import {
  callAsyncWithDebug,
  getDebugTitle,
  getSearchDebugBody,
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

      let span: ReturnType<typeof apm.startSpan> = null;

      if (apm.isStarted()) {
        span = apm.startSpan('apm_event_search', 'apm_event_search');
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      }

      let response: PromiseReturnType<typeof esClient.search>['body'];

      async function endSpan(outcome: EventOutcome) {
        if (span) {
          try {
            const stack: Array<{
              library_frame: boolean;
              filename: string;
              function?: string;
            }> = await (span as any)._stackObj!;

            const caller = stack.find(
              (site) =>
                !site.library_frame &&
                !site.filename.includes(
                  'create_es_client/create_apm_event_client'
                ) &&
                site.function !== '<anonymous'
            );

            let name = caller?.function;

            if (!name) {
              name =
                last(
                  caller?.filename.split('x-pack/plugins/apm/server')
                )?.replace(/\.[a-z]+$/, '') ?? span.name;
            }

            span.name = name;
          } catch (error) {
            // do nothing
          }

          // @ts-expect-error
          span.outcome = outcome;

          span.end();
        }
      }

      try {
        const searchParams = {
          ...withPossibleLegacyDataFilter,
          ignore_throttled: !includeFrozen,
          ignore_unavailable: true,
        };

        response = await callAsyncWithDebug({
          cb: () => {
            const searchPromise = cancelEsRequestOnAbort(
              esClient.search(searchParams),
              request
            );

            return unwrapEsResponse(searchPromise);
          },
          getMessage: () => ({
            body: getSearchDebugBody(searchParams),
            title: getDebugTitle(request),
          }),
          debug,
        });

        process.nextTick(() => endSpan(EventOutcome.success));
      } catch (err) {
        process.nextTick(() => endSpan(EventOutcome.failure));
        throw err;
      }

      return response as Promise<TypedSearchResponse<TParams>>;
    },
  };
}
