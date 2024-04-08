/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesStatsIndicesStats,
  IndicesStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { MeteringIndicesStatsResponse, MeteringStatsIndex } from '../../common/types';

export const fetchStats = (
  client: IScopedClusterClient,
  indexPattern: string
): Promise<IndicesStatsResponse> =>
  client.asCurrentUser.indices.stats({
    expand_wildcards: ['open'],
    index: indexPattern,
  });

export const parseIndicesStats = (
  statsIndices: Record<string, IndicesStatsIndicesStats> | undefined
) =>
  Object.entries(statsIndices ?? {}).reduce<Record<string, MeteringStatsIndex>>(
    (acc, [key, value]) => {
      acc[key] = {
        uuid: value.uuid,
        name: key,
        num_docs: value?.primaries?.docs?.count ?? null,
        size_in_bytes: value?.primaries?.store?.size_in_bytes ?? null,
      };
      return acc;
    },
    {}
  );

export const fetchMeteringStats = (
  client: IScopedClusterClient,
  indexPattern: string,
  secondaryAuthorization?: string | string[] | undefined
): Promise<MeteringIndicesStatsResponse> =>
  client.asInternalUser.transport.request(
    {
      method: 'GET',
      path: `/_metering/stats/${indexPattern}`,
    },
    { headers: { 'es-secondary-authorization': secondaryAuthorization } }
  );

export const parseMeteringStats = (meteringStatsIndices: MeteringStatsIndex[] | undefined) =>
  meteringStatsIndices?.reduce<Record<string, MeteringStatsIndex>>((acc, curr) => {
    acc[curr.name] = curr;
    return acc;
  }, {});

export const pickAvailableMeteringStats = (
  indicesBuckets: Array<{ key: string }> | undefined,
  meteringStatsIndices: Record<string, MeteringStatsIndex> | undefined
) =>
  indicesBuckets?.reduce((acc: Record<string, MeteringStatsIndex>, { key }: { key: string }) => {
    if (meteringStatsIndices?.[key]) {
      acc[key] = {
        name: meteringStatsIndices?.[key].name,
        num_docs: meteringStatsIndices?.[key].num_docs,
        size_in_bytes: null, // We don't have size_in_bytes intentionally when ILM is not available
        data_stream: meteringStatsIndices?.[key].data_stream,
      };
    }
    return acc;
  }, {});
