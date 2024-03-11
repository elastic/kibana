/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';
import { TIMESTAMP_FIELD } from '../../../../common/constants';
import { MetricsAPIRequest } from '../../../../common/http_api';
import { ESSearchClient } from '../../../lib/metrics/types';

interface GroupingResponse {
  count: {
    value: number;
  };
}

export const queryTotalGroupings = async (
  client: ESSearchClient,
  options: MetricsAPIRequest
): Promise<number> => {
  if (!options.groupBy || (isArray(options.groupBy) && options.groupBy.length === 0)) {
    return Promise.resolve(0);
  }

  let filters: Array<Record<string, any>> = [
    {
      range: {
        [TIMESTAMP_FIELD]: {
          gte: options.timerange.from,
          lte: options.timerange.to,
          format: 'epoch_millis',
        },
      },
    },
    ...options.groupBy.map((field) => ({ exists: { field } })),
  ];

  if (options.filters) {
    filters = [...filters, ...options.filters];
  }

  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: options.indexPattern,
    body: {
      size: 0,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        count: {
          cardinality: {
            script: options.groupBy.map((field) => `doc['${field}'].value`).join('+'),
          },
        },
      },
    },
  };

  const response = await client<{}, GroupingResponse>(params);
  return response.aggregations?.count.value ?? 0;
};
