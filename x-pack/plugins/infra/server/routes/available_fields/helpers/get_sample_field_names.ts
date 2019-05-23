/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AvailableFieldsAggregation,
  AvailableFieldsBucket,
  AvailableFieldsHit,
  AvailableFieldsRequest,
} from '../types';
import { extractFields } from './extract_fields';
import { InfraDatabaseSearchResponse } from '../../../lib/adapters/framework';

export const getSampleFieldNames = async (
  search: <Aggregation>(options: object) => Promise<InfraDatabaseSearchResponse<{}, Aggregation>>,
  options: AvailableFieldsRequest
): Promise<string[]> => {
  const params = {
    index: options.indexPattern,
    body: {
      query: {
        range: {
          [options.timeField]: {
            gte: options.from,
            lte: options.to,
            format: 'epoch_millis',
          },
        },
      },
      size: 0,
      aggs: {
        events: {
          composite: {
            size: 100,
            sources: [{ dataset: { terms: { field: 'event.dataset' } } }],
          },
          aggs: {
            docs: {
              top_hits: {
                size: 1,
                sort: [{ [options.timeField]: { order: 'desc' } }],
              },
            },
          },
        },
      },
    },
  };
  const response = await search<AvailableFieldsAggregation>(params);
  if (!response.aggregations) {
    throw new Error('Oops! Request is missing aggregations');
  }
  return response.aggregations.events.buckets.reduce(
    (fields: string[], bucket: AvailableFieldsBucket) => {
      return bucket.docs.hits.hits.reduce((acc: string[], hit: AvailableFieldsHit) => {
        return extractFields(hit._source, [], acc);
      }, fields);
    },
    []
  );
};
