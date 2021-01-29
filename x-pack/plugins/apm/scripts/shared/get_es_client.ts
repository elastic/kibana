/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from '@elastic/elasticsearch';
import { ApiKeyAuth, BasicAuth } from '@elastic/elasticsearch/lib/pool';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../../typings/elasticsearch';

export type ESClient = ReturnType<typeof getEsClient>;

export function getEsClient({
  node,
  auth,
}: {
  node: string;
  auth?: BasicAuth | ApiKeyAuth;
}) {
  const client = new Client({
    node,
    ssl: {
      rejectUnauthorized: false,
    },
    requestTimeout: 120000,
    auth,
  });

  return {
    ...client,
    async search<TDocument, TSearchRequest extends ESSearchRequest>(
      request: TSearchRequest
    ) {
      const response = await client.search(request as any);

      return {
        ...response,
        body: response.body as ESSearchResponse<TDocument, TSearchRequest>,
      };
    },
  };
}
