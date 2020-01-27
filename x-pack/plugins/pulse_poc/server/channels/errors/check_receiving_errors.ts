/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';
import { CheckContext } from '../../types';

export async function check(es: IScopedClusterClient, { deploymentId, indexName }: CheckContext) {
  // TODO: modify the search query for full text search
  const response = await es.callAsInternalUser('search', {
    index: indexName,
    size: 100,
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      query: {
        term: {
          deployment_id: {
            value: deploymentId,
          },
        },
      },
    },
  });

  if (response.hits.total.value === 0) {
    // we haven't recorded any errors so there aren't instructions to send back
    return undefined;
  } else {
    /*
     we have recorded errors and need to send instructions back that will help
     plugin owners resolve the errors
     we'll need to parse the stack trace and get information from it regarding:
      plugin name
      error type (fatal, warning etc)
      where it was first encountered
      etc
      TODO: see the logger for more info
     */
    return [
      {
        owner: 'core',
        id: 'pulse_error',
        value: {
          error_id: '1',
          fix_version: '7.7.0',
        },
      },
      {
        owner: 'core',
        id: 'pulse_error',
        value: {
          error_id: '2',
          fix_version: null,
        },
      },
    ];
  }
}
