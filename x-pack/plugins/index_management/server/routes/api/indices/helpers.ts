/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type { IScopedClusterClient } from '@kbn/core/server';
import { MAX_INDICES_PER_REQUEST } from '../../../../common/constants';

// To avoid having to to match method signatures with the client
// type, we use a generic CallableFn type.
type CallableFn = (args: Record<any, any>) => Promise<any>;

export async function executeAsyncByChunks<T>(
  // Since we are using a key to access the index method, we need
  // to use a generic type.
  params: {
    index: T[];
    format?: string;
    expand_wildcards?: string;
    max_num_segments?: number;
  },
  dataClient: IScopedClusterClient,
  methodName: keyof IScopedClusterClient['asCurrentUser']['indices']
) {
  const { index: indices, ...commonParams } = params;

  // When the number of indices is small, we can execute in a single request
  //
  // Otherwise we need to split the indices into chunks and execute them in multiple requests because
  // if we try to execute an action with too many indices that account for a long string in the request
  // ES will throw an error saying that the HTTP line is too large.
  if (indices.length <= MAX_INDICES_PER_REQUEST) {
    await (dataClient.asCurrentUser.indices[methodName] as CallableFn)({
      ...commonParams,
      index: indices,
    });
  } else {
    const chunks = chunk(indices, MAX_INDICES_PER_REQUEST);

    await Promise.all(
      chunks.map((chunkOfIndices) =>
        (dataClient.asCurrentUser.indices[methodName] as CallableFn)({
          ...commonParams,
          index: chunkOfIndices,
        })
      )
    );
  }
}
