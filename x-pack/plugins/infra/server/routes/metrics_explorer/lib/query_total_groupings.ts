/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isArray } from 'lodash';
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

  const params = {
    allowNoIndices: true,
    ignoreUnavailable: true,
    index: options.indexPattern,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              range: {
                [options.timerange.field]: {
                  gte: options.timerange.from,
                  lte: options.timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
            ...options.groupBy.map((field) => ({ exists: { field } })),
          ],
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
