/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { CoreSetup } from '@kbn/core/server';
import { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { unwrapEsResponse } from '@kbn/observability-plugin/server';

interface RequiredSearchParams {
  index: string | string[];
  body: { size: number; track_total_hits: boolean | number; timeout: string };
}

export interface IndicesStatsResponse {
  _all?: {
    total?: { store?: { size_in_bytes?: number }; docs?: { count?: number } };
    primaries?: {
      docs?: { count?: number };
      store?: {
        size_in_bytes?: number;
        total_data_set_size_in_bytes?: number;
      };
    };
  };
  _shards?: {
    total?: number;
  };
}

export interface TelemetryClient {
  search<TSearchRequest extends ESSearchRequest & RequiredSearchParams>(
    params: TSearchRequest
  ): Promise<ESSearchResponse<unknown, TSearchRequest>>;

  indicesStats(
    params: estypes.IndicesStatsRequest
    // promise returned by client has an abort property
    // so we cannot use its ReturnType
  ): Promise<IndicesStatsResponse>;

  transportRequest: (params: { path: string; method: 'get' }) => Promise<unknown>;

  fieldCaps(params: estypes.FieldCapsRequest): Promise<estypes.FieldCapsResponse>;
}

export async function getTelemetryClient({ core }: { core: CoreSetup }): Promise<TelemetryClient> {
  const [{ elasticsearch }] = await core.getStartServices();
  const esClient = elasticsearch.client;

  return {
    search: (params) =>
      unwrapEsResponse(esClient.asInternalUser.search(params, { meta: true })) as any,
    indicesStats: (params) =>
      unwrapEsResponse(esClient.asInternalUser.indices.stats(params, { meta: true })),
    transportRequest: (params) =>
      unwrapEsResponse(esClient.asInternalUser.transport.request(params, { meta: true })),
    fieldCaps: (params) =>
      unwrapEsResponse(esClient.asInternalUser.fieldCaps(params, { meta: true })),
  };
}
