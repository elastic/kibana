/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'src/core/server';
import { CheckContext } from '../../types';

export async function check(es: IScopedClusterClient, { deploymentId, indexName }: CheckContext) {
  const response = await es.callAsInternalUser('search', {
    index: indexName,
    size: 8,
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
  if (response.hits.hits && response.hits.hits.length) {
    const sources = response.hits.hits.map((hit: any) => {
      const { deployment_id, ...notification } = hit._source;
      return notification;
    });
    return sources;
  }

  // Mock return of pre-saved documents on the first fetch.
  // These will be resent from the client with "seen" status after the first fetch.
  // So the mocking is only needed for the first time.
  return [
    {
      deployment_id: '123',
      hash: 'snapshot_hash',
      endpoint_id: 'snapshot.create',
      action: {
        text: 'Take me there!',
        href: '/management/elasticsearch/snapshot_restore/add_repository',
      },
      description: [
        {
          type: 'text',
          text: 'You can now use the ',
        },
        {
          type: 'docLink',
          text: 'Snapshot and Restore',
        },
        {
          type: 'text',
          text: ' UI to manage taking snapshots.',
        },
      ],
    },
    {
      deployment_id: '123',
      hash: 'user_hash',
      endpoint_id: 'security.put_user',
      description: [
        {
          type: 'text',
          text: 'Would you prefer using the ',
        },
        {
          type: 'docLink',
          text: 'Create User',
        },
        {
          type: 'text',
          text: ' Kibana UI to manage and create users?',
        },
      ],
    },
  ];
}
