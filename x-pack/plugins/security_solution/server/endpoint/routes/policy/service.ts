/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchResponse } from 'elasticsearch';
import { ILegacyScopedClusterClient } from 'kibana/server';
import { GetHostPolicyResponse, HostPolicyResponse } from '../../../../common/endpoint/types';

export function getESQueryPolicyResponseByHostID(hostID: string, index: string) {
  return {
    body: {
      query: {
        match: {
          'host.id': hostID,
        },
      },
      sort: [
        {
          'event.created': {
            order: 'desc',
          },
        },
      ],
      size: 1,
    },
    index,
  };
}

export async function getPolicyResponseByHostId(
  index: string,
  hostId: string,
  dataClient: ILegacyScopedClusterClient
): Promise<GetHostPolicyResponse | undefined> {
  const query = getESQueryPolicyResponseByHostID(hostId, index);
  const response = (await dataClient.callAsCurrentUser('search', query)) as SearchResponse<
    HostPolicyResponse
  >;

  if (response.hits.hits.length === 0) {
    return undefined;
  }

  return {
    policy_response: response.hits.hits[0]._source,
  };
}
