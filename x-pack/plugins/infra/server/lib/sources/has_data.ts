/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchClient } from '../snapshot';

export const hasData = async (index: string, client: ESSearchClient) => {
  const params = {
    index,
    allowNoIndices: true,
    terminate_after: 1,
    ignoreUnavailable: true,
    body: {
      size: 0,
    },
  };
  const results = await client(params);
  return results.hits.total.value !== 0;
};
