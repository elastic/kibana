/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { MeteringIndicesStatsResponse } from '../../common/types';

export const fetchStats = (
  client: IScopedClusterClient,
  indexPattern: string
): Promise<IndicesStatsResponse> =>
  client.asCurrentUser.indices.stats({
    expand_wildcards: ['open'],
    index: indexPattern,
  });

/**
 * {
 *    "_shards": {
 *        "total": 4,
 *        "successful": 2,
 *        "failed": 0
 *    },
 *    "indices": [
 *      {
 *          "name": ".ds-my-datastream-03-02-2024-00001",
 *          "num_docs": 3,
 *          "size_in_bytes": 15785,
 *          "datastream": "my-datastream" // ---> ds name
 *      },
 *      {
 *        "name": "my-index-000001",
 *        "num_docs": 2,
 *        "size_in_bytes": 11462
 *      },
 *    ],
 *    "datastreams": [
 *      {
 *        "name": "my-datastream",
 *        "num_docs": 6,
 *        "size_in_bytes": 31752
 *      }
 *    ],
 *    "total": {
 *        "num_docs": 8,
 *        "size_in_bytes": 47214
 *    }
 * }
 */
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
