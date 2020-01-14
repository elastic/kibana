/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';
import { CheckContext } from '../../types';

export async function check(es: IScopedClusterClient, context: CheckContext) {
  const { deploymentId } = context;
  const response = await es.callAsInternalUser('search', {
    index: 'pulse-poc-raw*',
    size: 0,
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

  if (response.hits.total.value > 0) {
    return undefined;
  } else {
    return {
      owner: 'core',
      id: 'pulse_telemetry',
      value: 'try_again',
    };
  }
}
