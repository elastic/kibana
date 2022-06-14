/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const deleteIlms = async (esClient: ElasticsearchClient, ilmPolicyIds: string[]) => {
  await Promise.all(
    ilmPolicyIds.map(async (ilmPolicyId) => {
      await esClient.transport.request(
        {
          method: 'DELETE',
          path: `_ilm/policy/${ilmPolicyId}`,
        },
        {
          ignore: [404, 400],
        }
      );
    })
  );
};
