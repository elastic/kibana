/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EqlSearchRequest,
  FieldCapsRequest,
  FieldCapsResponse,
  MsearchMultisearchBody,
  MsearchMultisearchHeader,
  TermsEnumRequest,
  TermsEnumResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { unwrapEsResponse } from '@kbn/observability-plugin/server';
import { compact, omit } from 'lodash';
import { ValuesType } from 'utility-types';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { ApmDataSource } from '../../../../../common/data_source';
import { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
import { Metric } from '../../../../../typings/es_schemas/ui/metric';
import { Span } from '../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { Event } from '../../../../../typings/es_schemas/ui/event';
import { withApmSpan } from '../../../../utils/with_apm_span';
import { callAsyncWithDebug, getDebugBody, getDebugTitle } from '../call_async_with_debug';
import { cancelEsRequestOnAbort } from '../cancel_es_request_on_abort';
import { ProcessorEventOfDocumentType } from '../document_type';
import { getRequestBase, processorEventsToIndex } from './get_request_base';

export type APMEventESSearchRequest = Omit<ESSearchRequest, 'index'> & {
  apm: {
    includeLegacyData?: boolean;
  } & ({ events: ProcessorEvent[] } | { sources: ApmDataSource[] });
  body: {
    size: number;
    track_total_hits: boolean | number;
  };
};

export type APMLogEventESSearchRequest = Omit<ESSearchRequest, 'index'> & {
  body: {
    size: number;
    track_total_hits: boolean | number;
  };
};

type APMEventWrapper<T> = Omit<T, 'index'> & {
  apm: { events: ProcessorEvent[] };
};

type APMEventTermsEnumRequest = APMEventWrapper<TermsEnumRequest>;
type APMEventEqlSearchRequest = APMEventWrapper<EqlSearchRequest>;
type APMEventFieldCapsRequest = APMEventWrapper<FieldCapsRequest>;

type TypeOfProcessorEvent<T extends ProcessorEvent> = {
  [ProcessorEvent.error]: APMError;
  [ProcessorEvent.transaction]: Transaction;
  [ProcessorEvent.span]: Span;
  [ProcessorEvent.metric]: Metric;
}[T];

type TypedLogEventSearchResponse<TParams extends APMLogEventESSearchRequest> =
  InferSearchResponseOf<Event, TParams>;

type TypedSearchResponse<TParams extends APMEventESSearchRequest> = InferSearchResponseOf<
  TypeOfProcessorEvent<
    TParams['apm'] extends { events: ProcessorEvent[] }
      ? ValuesType<TParams['apm']['events']>
      : TParams['apm'] extends { sources: ApmDataSource[] }
      ? ProcessorEventOfDocumentType<ValuesType<TParams['apm']['sources']>['documentType']>
      : never
  >,
  TParams
>;

interface TypedMSearchResponse<TParams extends APMEventESSearchRequest> {
  responses: Array<TypedSearchResponse<TParams>>;
}

export interface APMEventClientConfig {
  esClient: ElasticsearchClient;
  debug: boolean;
  request: KibanaRequest;
  indices: APMIndices;
  options: {
    includeFrozen: boolean;
  };
}

export class APMEventClient {
  private readonly esClient: ElasticsearchClient;
  private readonly debug: boolean;
  private readonly request: KibanaRequest;
  public readonly indices: APMIndices;
  private readonly includeFrozen: boolean;

  constructor(config: APMEventClientConfig) {
    this.esClient = config.esClient;
    this.debug = config.debug;
    this.request = config.request;
    this.indices = config.indices;
    this.includeFrozen = config.options.includeFrozen;
  }

  private callAsyncWithDebug<T extends { body: any }>({
    requestType,
    params,
    cb,
    operationName,
  }: {
    requestType: string;
    params: Record<string, any>;
    cb: (requestOpts: { signal: AbortSignal; meta: true }) => Promise<T>;
    operationName: string;
  }): Promise<T['body']> {
    return callAsyncWithDebug({
      getDebugMessage: () => ({
        body: getDebugBody({
          params,
          requestType,
          operationName,
        }),
        title: getDebugTitle(this.request),
      }),
      isCalledWithInternalUser: false,
      debug: this.debug,
      request: this.request,
      operationName,
      requestParams: params,
      cb: () => {
        const controller = new AbortController();

        const promise = withApmSpan(operationName, () => {
          return cancelEsRequestOnAbort(
            cb({ signal: controller.signal, meta: true }),
            this.request,
            controller
          );
        });

        return unwrapEsResponse(promise);
      },
    });
  }

  async search<TParams extends APMEventESSearchRequest>(
    operationName: string,
    params: TParams
  ): Promise<TypedSearchResponse<TParams>> {
    const { index, filters } = getRequestBase({
      apm: params.apm,
      indices: this.indices,
    });

    const searchParams = {
      ...omit(params, 'apm', 'body'),
      index,
      body: {
        ...params.body,
        query: {
          bool: {
            filter: filters,
            must: compact([params.body.query]),
          },
        },
      },
      ...(this.includeFrozen ? { ignore_throttled: false } : {}),
      ignore_unavailable: true,
      preference: 'any',
      expand_wildcards: ['open' as const, 'hidden' as const],
    };

    return this.callAsyncWithDebug({
      cb: (opts) =>
        this.esClient.search(searchParams, opts) as unknown as Promise<{
          body: TypedSearchResponse<TParams>;
        }>,
      operationName,
      params: searchParams,
      requestType: 'search',
    });
  }

  async logEventSearch<TParams extends APMLogEventESSearchRequest>(
    operationName: string,
    params: TParams
  ): Promise<TypedLogEventSearchResponse<TParams>> {
    // Reusing indices configured for errors since both events and errors are stored as logs.
    const index = processorEventsToIndex([ProcessorEvent.error], this.indices);

    const searchParams = {
      ...omit(params, 'body'),
      index,
      body: {
        ...params.body,
        query: {
          bool: {
            must: compact([params.body.query]),
          },
        },
      },
      ...(this.includeFrozen ? { ignore_throttled: false } : {}),
      ignore_unavailable: true,
      preference: 'any',
      expand_wildcards: ['open' as const, 'hidden' as const],
    };

    return this.callAsyncWithDebug({
      cb: (opts) =>
        this.esClient.search(searchParams, opts) as unknown as Promise<{
          body: TypedLogEventSearchResponse<TParams>;
        }>,
      operationName,
      params: searchParams,
      requestType: 'search',
    });
  }

  async msearch<TParams extends APMEventESSearchRequest>(
    operationName: string,
    ...allParams: TParams[]
  ): Promise<TypedMSearchResponse<TParams>> {
    const searches = allParams
      .map((params) => {
        const { index, filters } = getRequestBase({
          apm: params.apm,
          indices: this.indices,
        });

        const searchParams: [MsearchMultisearchHeader, MsearchMultisearchBody] = [
          {
            index,
            preference: 'any',
            ...(this.includeFrozen ? { ignore_throttled: false } : {}),
            ignore_unavailable: true,
            expand_wildcards: ['open' as const, 'hidden' as const],
          },
          {
            ...omit(params, 'apm', 'body'),
            ...params.body,
            query: {
              bool: {
                filter: compact([params.body.query, ...filters]),
              },
            },
          },
        ];

        return searchParams;
      })
      .flat();

    return this.callAsyncWithDebug({
      cb: (opts) =>
        this.esClient.msearch(
          {
            searches,
          },
          opts
        ) as unknown as Promise<{
          body: TypedMSearchResponse<TParams>;
        }>,
      operationName,
      params: searches,
      requestType: 'msearch',
    });
  }

  async eqlSearch(operationName: string, params: APMEventEqlSearchRequest) {
    const index = processorEventsToIndex(params.apm.events, this.indices);

    const requestParams = {
      ...omit(params, 'apm'),
      index,
    };

    return this.callAsyncWithDebug({
      operationName,
      requestType: 'eql_search',
      params: requestParams,
      cb: (opts) => this.esClient.eql.search(requestParams, opts),
    });
  }

  async fieldCaps(
    operationName: string,
    params: APMEventFieldCapsRequest
  ): Promise<FieldCapsResponse> {
    const index = processorEventsToIndex(params.apm.events, this.indices);

    const requestParams = {
      ...omit(params, 'apm'),
      index,
    };

    return this.callAsyncWithDebug({
      operationName,
      requestType: '_field_caps',
      params: requestParams,
      cb: (opts) => this.esClient.fieldCaps(requestParams, opts),
    });
  }

  async termsEnum(
    operationName: string,
    params: APMEventTermsEnumRequest
  ): Promise<TermsEnumResponse> {
    const index = processorEventsToIndex(params.apm.events, this.indices);

    const requestParams = {
      ...omit(params, 'apm'),
      index: index.join(','),
    };

    return this.callAsyncWithDebug({
      operationName,
      requestType: '_terms_enum',
      params: requestParams,
      cb: (opts) => this.esClient.termsEnum(requestParams, opts),
    });
  }

  getIndicesFromProcessorEvent(processorEvent: ProcessorEvent) {
    return processorEventsToIndex([processorEvent], this.indices);
  }
}
