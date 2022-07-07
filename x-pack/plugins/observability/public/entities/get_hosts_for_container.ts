/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart, IKibanaSearchRequest } from '@kbn/data-plugin/public';
import { lastValueFrom } from 'rxjs';
import { rangeQuery } from '../../common/utils/queries';
import { AggBucket } from './types';

export async function getHostNamesForContainers({
  client,
  containerIds,
  index,
  start,
  end,
}: {
  client: DataPublicPluginStart;
  containerIds: string[];
  index: string;
  start: number;
  end: number;
}): Promise<string[]> {
  const request: IKibanaSearchRequest = {
    id: 'get_hosts',
    params: {
      index,
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: {
                'container.id': containerIds,
              },
            },
            ...rangeQuery(start, end),
          ],
        },
      },
      aggs: {
        hostNames: {
          terms: {
            field: 'host.name',
            size: 500,
          },
        },
      },
    },
  };

  const { rawResponse } = await lastValueFrom(client.search.search(request));

  return rawResponse.aggregations?.hostNames?.buckets.map((bucket: AggBucket) => bucket.key) ?? [];
}
