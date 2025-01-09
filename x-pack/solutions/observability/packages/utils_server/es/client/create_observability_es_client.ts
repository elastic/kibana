/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EsqlQueryRequest,
  FieldCapsRequest,
  FieldCapsResponse,
  MsearchRequest,
  ScalarValue,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { withSpan } from '@kbn/apm-utils';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ESSearchRequest, InferSearchResponseOf } from '@kbn/es-types';
import { Required, ValuesType } from 'utility-types';
import { DedotObject } from '@kbn/utility-types';
import { unflattenObject } from '@kbn/task-manager-plugin/server/metrics/lib';
import { esqlResultToPlainObjects } from '../esql_result_to_plain_objects';

type SearchRequest = ESSearchRequest & {
  index: string | string[];
  track_total_hits: number | boolean;
  size: number;
};

export interface EsqlOptions {
  transform?: 'none' | 'plain' | 'unflatten';
}

export type EsqlValue = ScalarValue | ScalarValue[];

export type EsqlOutput = Record<string, EsqlValue>;

type MaybeUnflatten<T extends Record<string, any>, TApply> = TApply extends true
  ? DedotObject<T>
  : T;

interface UnparsedEsqlResponseOf<TOutput extends EsqlOutput> {
  columns: Array<{ name: keyof TOutput; type: string }>;
  values: Array<Array<ValuesType<TOutput>>>;
}

interface ParsedEsqlResponseOf<
  TOutput extends EsqlOutput,
  TOptions extends EsqlOptions | undefined = { transform: 'none' }
> {
  hits: Array<
    MaybeUnflatten<
      {
        [key in keyof TOutput]: TOutput[key];
      },
      TOptions extends { transform: 'unflatten' } ? true : false
    >
  >;
}

export type InferEsqlResponseOf<
  TOutput extends EsqlOutput,
  TOptions extends EsqlOptions | undefined = { transform: 'none' }
> = TOptions extends { transform: 'plain' | 'unflatten' }
  ? ParsedEsqlResponseOf<TOutput, TOptions>
  : UnparsedEsqlResponseOf<TOutput>;

export type ObservabilityESSearchRequest = SearchRequest;

export type ObservabilityEsQueryRequest = Omit<EsqlQueryRequest, 'format' | 'columnar'>;

export type ParsedEsqlResponse = ParsedEsqlResponseOf<EsqlOutput, EsqlOptions>;
export type UnparsedEsqlResponse = UnparsedEsqlResponseOf<EsqlOutput>;

export type EsqlQueryResponse = UnparsedEsqlResponse | ParsedEsqlResponse;

/**
 * An Elasticsearch Client with a fully typed `search` method and built-in
 * APM instrumentation.
 */
export interface ObservabilityElasticsearchClient {
  search<TDocument = unknown, TSearchRequest extends SearchRequest = SearchRequest>(
    operationName: string,
    parameters: TSearchRequest
  ): Promise<InferSearchResponseOf<TDocument, TSearchRequest, { restTotalHitsAsInt: false }>>;
  msearch<TDocument = unknown>(
    operationName: string,
    parameters: MsearchRequest
  ): Promise<{
    responses: Array<SearchResponse<TDocument>>;
  }>;
  fieldCaps(
    operationName: string,
    request: Required<FieldCapsRequest, 'index_filter' | 'fields' | 'index'>
  ): Promise<FieldCapsResponse>;
  esql<TOutput extends EsqlOutput = EsqlOutput>(
    operationName: string,
    parameters: ObservabilityEsQueryRequest
  ): Promise<InferEsqlResponseOf<TOutput, { transform: 'none' }>>;
  esql<
    TOutput extends EsqlOutput = EsqlOutput,
    TEsqlOptions extends EsqlOptions = { transform: 'none' }
  >(
    operationName: string,
    parameters: ObservabilityEsQueryRequest,
    options: TEsqlOptions
  ): Promise<InferEsqlResponseOf<TOutput, TEsqlOptions>>;
  client: ElasticsearchClient;
}

export function createObservabilityEsClient({
  client,
  logger,
  plugin,
  labels,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  plugin?: string;
  labels?: Record<string, string>;
}): ObservabilityElasticsearchClient {
  // wraps the ES calls in a named APM span for better analysis
  // (otherwise it would just eg be a _search span)
  const callWithLogger = <T>(
    operationName: string,
    request: Record<string, any>,
    callback: () => Promise<T>
  ) => {
    logger.debug(() => `Request (${operationName}):\n${JSON.stringify(request)}`);
    return withSpan(
      {
        name: operationName,
        labels: {
          ...labels,
          ...(plugin ? { plugin } : {}),
        },
      },
      callback,
      logger
    ).then((response) => {
      logger.trace(() => `Response (${operationName}):\n${JSON.stringify(response, null, 2)}`);
      return response;
    });
  };

  return {
    client,
    fieldCaps(operationName, parameters) {
      return callWithLogger(operationName, parameters, () => {
        return client.fieldCaps({
          ...parameters,
        });
      });
    },
    esql(
      operationName: string,
      parameters: ObservabilityEsQueryRequest,
      options?: EsqlOptions
    ): Promise<InferEsqlResponseOf<EsqlOutput, EsqlOptions>> {
      return callWithLogger(operationName, parameters, () => {
        return client.esql
          .query(
            { ...parameters },
            {
              querystring: {
                drop_null_columns: true,
              },
            }
          )
          .then((response) => {
            const esqlResponse = response as unknown as UnparsedEsqlResponseOf<EsqlOutput>;

            const transform = options?.transform ?? 'none';

            if (transform === 'none') {
              return esqlResponse;
            }

            const parsedResponse = { hits: esqlResultToPlainObjects(esqlResponse) };

            if (transform === 'plain') {
              return parsedResponse;
            }

            return {
              hits: parsedResponse.hits.map((hit) => unflattenObject(hit)),
            };
          }) as Promise<InferEsqlResponseOf<EsqlOutput, EsqlOptions>>;
      });
    },
    search<TDocument = unknown, TSearchRequest extends SearchRequest = SearchRequest>(
      operationName: string,
      parameters: SearchRequest
    ) {
      return callWithLogger(operationName, parameters, () => {
        return client.search<TDocument>(parameters) as unknown as Promise<
          InferSearchResponseOf<TDocument, TSearchRequest, { restTotalHitsAsInt: false }>
        >;
      });
    },
    msearch<TDocument = unknown>(operationName: string, parameters: MsearchRequest) {
      return callWithLogger(operationName, parameters, () => {
        return client.msearch<TDocument>(parameters) as unknown as Promise<{
          responses: Array<SearchResponse<TDocument>>;
        }>;
      });
    },
  };
}
