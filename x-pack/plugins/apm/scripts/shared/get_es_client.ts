/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ApiKeyAuth, BasicAuth } from '@elastic/elasticsearch/lib/pool';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '../../../../../src/core/types/elasticsearch';

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

  const originalSearch = client.search.bind(client);

  async function search<
    TDocument = unknown,
    TSearchRequest extends ESSearchRequest = ESSearchRequest
  >(request: TSearchRequest) {
    const response = await originalSearch<TDocument>(request);

    return {
      ...response,
      body: response.body as unknown as ESSearchResponse<
        TDocument,
        TSearchRequest
      >,
    };
  }

  // @ts-expect-error
  client.search = search;

  return client as unknown as Omit<Client, 'search'> & {
    search: typeof search;
  };
}
