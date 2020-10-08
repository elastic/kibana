/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolveIndexResponseFromES } from './types';

/**
 * Throws if the index name is not found in the resolved indices response
 *
 * @param indexName Assume this is an index name, not an alias
 * @param resolvedResponse The response from _resolve/index/<indices>
 */
export const getIndexState = (
  indexName: string,
  resolvedResponse: ResolveIndexResponseFromES
): 'open' | 'closed' => {
  const index = resolvedResponse.indices.find((i) => i.name === indexName);
  if (index) {
    return index.attributes.includes('closed') ? 'closed' : 'open';
  }
  throw new Error(`${indexName} not found!`);
};
