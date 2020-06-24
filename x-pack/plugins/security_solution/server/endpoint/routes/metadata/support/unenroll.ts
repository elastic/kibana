/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller, IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { metadataMirrorIndexPattern } from '../../../../../common/endpoint/constants';
import { EndpointStatus } from '../../../../../common/endpoint/types';

const KEEPALIVE = '10s';

export interface HostId {
  host: {
    id: string;
  };
}

interface HitSource {
  _source: HostId;
}

export async function findUnenrolledHostByHostId(
  client: IScopedClusterClient,
  hostId: string
): Promise<HostId | undefined> {
  const queryParams = {
    index: metadataMirrorIndexPattern,
    body: {
      size: 1,
      _source: ['host.id'],
      query: {
        bool: {
          must: {
            term: { 'host.id': hostId },
          },
          filter: {
            term: {
              'Endpoint.status': EndpointStatus.UNENROLLED,
            },
          },
        },
      },
    },
  };

  const response = (await client.callAsCurrentUser('search', queryParams)) as SearchResponse<
    HostId
  >;
  const newHits = response.hits?.hits || [];

  if (newHits.length > 0) {
    const hostIds = newHits
      .flatMap((data) => data as HitSource)
      .map((hitSource: HitSource) => hitSource._source);
    return hostIds[0];
  } else {
    return undefined;
  }
}

export async function findAllUnenrolledHostIds(client: IScopedClusterClient): Promise<HostId[]> {
  const queryParams = {
    index: metadataMirrorIndexPattern,
    scroll: KEEPALIVE,
    body: {
      size: 100,
      _source: ['host.id'],
      query: {
        bool: {
          filter: {
            term: {
              'Endpoint.status': EndpointStatus.UNENROLLED,
            },
          },
        },
      },
    },
  };
  const response = (await client.callAsCurrentUser('search', queryParams)) as SearchResponse<
    HostId
  >;

  // eslint-disable-next-line no-return-await
  return await fetchAllUnenrolledHostIdsWithScroll(response, client.callAsCurrentUser);
}

export async function fetchAllUnenrolledHostIdsWithScroll(
  response: SearchResponse<HostId>,
  client: APICaller,
  hits: HostId[] = []
): Promise<HostId[]> {
  const newHits = response.hits?.hits || [];
  const scrollId = response._scroll_id;

  if (newHits.length > 0) {
    const hostIds: HostId[] = newHits
      .flatMap((data) => data as HitSource)
      .map((hitSource: HitSource) => hitSource._source);
    hits.push(...hostIds);

    const innerResponse = await client('scroll', {
      body: {
        scroll: KEEPALIVE,
        scroll_id: scrollId,
      },
    });

    // eslint-disable-next-line no-return-await
    return await fetchAllUnenrolledHostIdsWithScroll(innerResponse, client, hits);
  }
  return hits;
}
