/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';

interface ErrorSignatureFixedVersionPair {
  error: string;
  fixedVersions?: string[];
}
export async function check(es: IScopedClusterClient, deploymentId: string) {
  const errorSignatureFixedVersionPairs: ErrorSignatureFixedVersionPair[] = [
    {
      error: 'example_error',
      fixedVersions: ['7.5.1'],
    },
  ];
  // the following request is throwing a "ServiceUnavailable" error in Kibana startup.
  const response = await es.callAsInternalUser('search', {
    index: 'pulse-poc-raw-errors',
    size: 0,
    allow_no_indices: true,
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          must: [
            {
              term: { deployment_id: deploymentId },
            },
          ],
          filter: {
            exists: { field: 'fixed_version' },
          },
        },
      },
    },
  });

  if (response.hits.total.value === 0) {
    // we don't have any bugs-fixed version info for the current deployment
    return undefined;
  } else {
    // we have fixed-version info for bugs and need to extract error signatures and fixed-version values from each doc
    // we then need to create error-signature/fixed-version pairs and return those.
    // assuming each document only contains a single error and a collection of fixed versions for that error:
    // TODO: check what the actual response looks like. I'm assuming we're got something along the lines of docs objects
    response.hits.hits.forEach((doc: any) =>
      errorSignatureFixedVersionPairs.push({
        error: doc._source.error_signature,
        fixedVersions: doc._source.fixed_versions,
      })
    );
    return {
      owner: 'core',
      id: 'pulse_errors',
      value: errorSignatureFixedVersionPairs,
    };
  }
}
