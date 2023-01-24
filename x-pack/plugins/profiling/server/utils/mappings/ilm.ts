/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import IlmApi from '@elastic/elasticsearch/lib/api/api/ilm';
import { IlmPutLifecycleResponse } from '@elastic/elasticsearch/lib/api/types';

export async function ilmPolicy(api: IlmApi): Promise<IlmPutLifecycleResponse> {
  return api.putLifecycle({
    name: 'profiling',
    policy: {
      phases: {
        hot: {
          min_age: '0ms',
          actions: {
            rollover: {
              max_primary_shard_size: '50gb',
              max_age: '7d',
            },
            set_priority: {
              priority: 100,
            },
          },
        },
        warm: {
          min_age: '30d',
          actions: {
            set_priority: {
              priority: 50,
            },
            shrink: {
              number_of_shards: 2,
            },
          },
        },
        delete: {
          min_age: '60d',
          actions: {
            delete: {
              delete_searchable_snapshot: true,
            },
          },
        },
      },
    },
  });
}
