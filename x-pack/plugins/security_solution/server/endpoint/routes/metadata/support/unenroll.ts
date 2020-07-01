/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller, ILegacyScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { metadataMirrorIndexPattern } from '../../../../../common/endpoint/constants';
import { EndpointStatus } from '../../../../../common/endpoint/types';

const KEEPALIVE = '30s';
const SIZE = 1000;

export interface HostId {
  host: {
    id: string;
  };
}

interface HitSource {
  _source: HostId;
}

export async function findUnenrolledHostByHostId(
  client: ILegacyScopedClusterClient,
  hostId: string
): Promise<HostId | undefined> {
  const queryParams = {
    index: metadataMirrorIndexPattern,
    body: {
      size: 1,
      _source: ['host.id'],
      query: {
        bool: {
          filter: [
            {
              term: {
                'Endpoint.status': EndpointStatus.unenrolled,
              },
            },
            {
              term: {
                'host.id': hostId,
              },
            },
          ],
        },
      },
    },
  };

  const response = (await client.callAsCurrentUser('search', queryParams)) as SearchResponse<
    HostId
  >;
  const newHits = response.hits?.hits || [];

  if (newHits.length > 0) {
    const hostIds = newHits.map((hitSource: HitSource) => hitSource._source);
    return hostIds[0];
  } else {
    return undefined;
  }
}

export async function findAllUnenrolledHostIds(
  client: ILegacyScopedClusterClient
): Promise<HostId[]> {
  const queryParams = {
    index: metadataMirrorIndexPattern,
    scroll: KEEPALIVE,
    body: {
      size: SIZE,
      _source: ['host.id'],
      query: {
        bool: {
          filter: {
            term: {
              'Endpoint.status': EndpointStatus.unenrolled,
            },
          },
        },
      },
    },
  };
  const response = (await client.callAsCurrentUser('search', queryParams)) as SearchResponse<
    HostId
  >;

  return fetchAllUnenrolledHostIdsWithScroll(response, client.callAsCurrentUser);
}

export async function fetchAllUnenrolledHostIdsWithScroll(
  response: SearchResponse<HostId>,
  client: LegacyAPICaller,
  hits: HostId[] = []
): Promise<HostId[]> {
  let newHits = response.hits?.hits || [];
  let scrollId = response._scroll_id;

  while (newHits.length > 0) {
    const hostIds: HostId[] = newHits.map((hitSource: HitSource) => hitSource._source);
    hits.push(...hostIds);

    const innerResponse = await client('scroll', {
      body: {
        scroll: KEEPALIVE,
        scroll_id: scrollId,
      },
    });

    newHits = innerResponse.hits?.hits || [];
    scrollId = innerResponse._scroll_id;
  }
  return hits;
}
