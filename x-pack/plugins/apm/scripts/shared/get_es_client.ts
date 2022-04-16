/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { ClientOptions } from '@elastic/elasticsearch/lib/client';
import {
  ESSearchResponse,
  ESSearchRequest,
} from '@kbn/core/types/elasticsearch';

export type ESClient = ReturnType<typeof getEsClient>;

export function getEsClient({
  node,
  auth,
}: {
  node: string;
  auth?: ClientOptions['auth'];
  // Should be refactored
  // The inferred type of 'getEsClient' references an inaccessible 'unique symbol' type. A type annotation is necessary.
}): any {
  const client = new Client({
    node,
    tls: {
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
    const response = await originalSearch(request);

    return {
      ...response,
      body: response as unknown as ESSearchResponse<TDocument, TSearchRequest>,
    };
  }

  // @ts-expect-error
  client.search = search;

  return client as unknown as Omit<Client, 'search'> & {
    search: typeof search;
  };
}
