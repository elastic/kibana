/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMElasticsearchQueryFn } from '../adapters';

export const getTags: UMElasticsearchQueryFn<{}, string[]> = async ({
  callES,
  dynamicSettings,
}) => {
  const params = {
    index: dynamicSettings.heartbeatIndices,
    body: {
      aggs: {
        tags: {
          terms: {
            field: 'tags',
            size: 1000,
          },
        },
      },
    },
  };

  const result = await callES('search', params);

  return result?.aggregations?.tags?.buckets?.map((tag: any) => tag.key) ?? [];
};
