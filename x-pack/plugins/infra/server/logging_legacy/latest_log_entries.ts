/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestParams } from '@elastic/elasticsearch';

import { InfraDatabaseSearchResponse } from '../lib/adapters/framework';

export async function fetchLatestTime(
  search: <Hit, Aggregations>(
    params: RequestParams.Search
  ) => Promise<InfraDatabaseSearchResponse<Hit, Aggregations>>,
  indices: string[],
  timeField: string
): Promise<number> {
  const response = await search<any, { max_time?: { value: number } }>({
    allow_no_indices: true,
    body: {
      aggregations: {
        max_time: {
          max: {
            field: timeField,
          },
        },
      },
      query: {
        match_all: {},
      },
      size: 0,
    },
    ignore_unavailable: true,
    index: indices,
  });

  if (response.aggregations && response.aggregations.max_time) {
    return response.aggregations.max_time.value;
  } else {
    return 0;
  }
}
