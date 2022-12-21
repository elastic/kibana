/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core/server';

import { ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT } from '../../common/constants';

export const fetchSearchResults = async (
  client: IScopedClusterClient,
  indexName: string,
  query?: string,
  from: number = 0,
  size: number = ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT
): Promise<SearchResponseBody> => {
  const results = await client.asCurrentUser.search({
    from,
    index: indexName,
    size,
    ...(!!query ? { q: JSON.stringify(query) } : {}),
  });
  return results;
};
