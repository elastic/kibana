/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { SearchParams } from 'elasticsearch';
import * as Joi from 'joi';

import {
  BucketSize,
  LogSummaryApiPostPayload,
  LogSummaryApiPostResponse,
} from '../../common/http_api';
import { LogSummaryBucket } from '../../common/log_summary';
import {
  InfraBackendFrameworkAdapter,
  InfraDatabaseSearchResponse,
  InfraWrappableRequest,
} from '../lib/adapters/framework';
import { convertDateHistogramToSummaryBuckets } from './converters';
import { DateHistogramResponse } from './elasticsearch';
import { indicesSchema, summaryBucketSizeSchema, timestampSchema } from './schemas';

export const initLogSummaryRoutes = (framework: InfraBackendFrameworkAdapter) => {
  const callWithRequest = framework.callWithRequest;

  framework.registerRoute<
    InfraWrappableRequest<LogSummaryApiPostPayload, {}, {}>,
    LogSummaryApiPostResponse
  >({
    config: {
      validate: {
        payload: Joi.object().keys({
          after: Joi.number()
            .integer()
            .min(0)
            .required(),
          before: Joi.number()
            .integer()
            .min(0)
            .required(),
          bucketSize: summaryBucketSizeSchema.required(),
          fields: Joi.object()
            .keys({
              time: Joi.string().required(),
            })
            .required(),
          indices: indicesSchema.required(),
          target: timestampSchema.required(),
        }),
      },
    },
    handler: async (request, reply) => {
      const timings = {
        esRequestSent: Date.now(),
        esResponseProcessed: 0,
      };

      try {
        const search = <Aggregations>(params: SearchParams) =>
          callWithRequest<{}, Aggregations>(request, 'search', params);
        const summaryBuckets = await fetchSummaryBuckets(
          search,
          request.payload.indices,
          request.payload.fields,
          request.payload.target,
          request.payload.after,
          request.payload.before,
          request.payload.bucketSize
        );

        timings.esResponseProcessed = Date.now();

        return reply({
          buckets: summaryBuckets,
          timings,
        });
      } catch (requestError) {
        return reply(Boom.wrap(requestError));
      }
    },
    method: 'POST',
    path: '/api/logging/summary',
  });
};

async function fetchSummaryBuckets(
  search: <Aggregations>(
    params: SearchParams
  ) => Promise<InfraDatabaseSearchResponse<{}, Aggregations>>,
  indices: string[],
  fields: {
    time: string;
  },
  target: number,
  after: number,
  before: number,
  bucketSize: {
    unit: BucketSize;
    value: number;
  }
): Promise<LogSummaryBucket[]> {
  const minDate = `${target}||-${before * bucketSize.value}${bucketSize.unit}/${bucketSize.unit}`;
  const maxDate = `${target}||+${after * bucketSize.value + 1}${bucketSize.unit}/${
    bucketSize.unit
  }`;
  const response = await search<{
    count_by_date?: DateHistogramResponse;
  }>({
    allowNoIndices: true,
    body: {
      aggregations: {
        count_by_date: {
          date_histogram: {
            extended_bounds: {
              max: maxDate,
              min: minDate,
            },
            field: fields.time,
            interval: `${bucketSize.value}${bucketSize.unit}`,
            min_doc_count: 0,
          },
        },
      },
      query: {
        range: {
          [fields.time]: {
            format: 'epoch_millis',
            gte: minDate,
            lt: maxDate,
          },
        },
      },
      size: 0,
    },
    ignoreUnavailable: true,
    index: indices,
  });

  if (response.aggregations && response.aggregations.count_by_date) {
    return convertDateHistogramToSummaryBuckets()(response.aggregations.count_by_date.buckets);
  } else {
    return [];
  }
}
