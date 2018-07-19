/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { SearchParams } from 'elasticsearch';
import * as Joi from 'joi';

import { SearchSummaryApiPostPayload, SearchSummaryApiPostResponse } from '../../common/http_api';
import { LogEntryFieldsMapping } from '../../common/log_entry';
import { SearchSummaryBucket } from '../../common/log_search_summary';
import { SummaryBucketSize } from '../../common/log_summary';
import {
  InfraBackendFrameworkAdapter,
  InfraDatabaseSearchResponse,
  InfraWrappableRequest,
} from '../lib/adapters/framework';
import { convertDateHistogramToSearchSummaryBuckets } from './converters';
import { DateHistogramResponse } from './elasticsearch';
import {
  indicesSchema,
  logEntryFieldsMappingSchema,
  summaryBucketSizeSchema,
  timestampSchema,
} from './schemas';

export const initSearchSummaryRoutes = (framework: InfraBackendFrameworkAdapter) => {
  const callWithRequest = framework.callWithRequest;

  framework.registerRoute<
    InfraWrappableRequest<SearchSummaryApiPostPayload, {}, {}>,
    SearchSummaryApiPostResponse
  >({
    config: {
      validate: {
        payload: Joi.object().keys({
          bucketSize: summaryBucketSizeSchema.required(),
          end: timestampSchema.required(),
          fields: logEntryFieldsMappingSchema.required(),
          indices: indicesSchema.required(),
          query: Joi.string().required(),
          start: timestampSchema.required(),
        }),
      },
    },
    handler: async (request, reply) => {
      const timings = {
        esRequestSent: Date.now(),
        esResponseProcessed: 0,
      };

      try {
        const search = <Hit, Aggregations>(params: SearchParams) =>
          callWithRequest<Hit, Aggregations>(request, 'search', params);
        const summaryBuckets = await fetchSummaryBuckets(
          search,
          request.payload.indices,
          request.payload.fields,
          request.payload.start,
          request.payload.end,
          request.payload.bucketSize,
          request.payload.query
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
    path: '/api/logging/search-summary',
  });
};

async function fetchSummaryBuckets(
  search: <Hit, Aggregations>(
    params: SearchParams
  ) => Promise<InfraDatabaseSearchResponse<Hit, Aggregations>>,
  indices: string[],
  fields: LogEntryFieldsMapping,
  start: number,
  end: number,
  bucketSize: {
    unit: SummaryBucketSize;
    value: number;
  },
  query: string
): Promise<SearchSummaryBucket[]> {
  const response = await search<any, { count_by_date?: DateHistogramResponse }>({
    allowNoIndices: true,
    body: {
      aggregations: {
        count_by_date: {
          aggregations: {
            top_entries: {
              top_hits: {
                _source: [fields.message],
                size: 1,
                sort: [{ [fields.time]: 'desc' }, { [fields.tiebreaker]: 'desc' }],
              },
            },
          },
          date_histogram: {
            extended_bounds: {
              max: end,
              min: start,
            },
            field: fields.time,
            interval: `${bucketSize.value}${bucketSize.unit}`,
            min_doc_count: 0,
          },
        },
      },
      query: {
        bool: {
          filter: [
            {
              query_string: {
                default_field: fields.message,
                default_operator: 'AND',
                query,
              },
            },
            {
              range: {
                [fields.time]: {
                  format: 'epoch_millis',
                  gte: start,
                  lt: end,
                },
              },
            },
          ],
        },
      },
      size: 0,
    },
    ignoreUnavailable: true,
    index: indices,
  });

  if (response.aggregations && response.aggregations.count_by_date) {
    return convertDateHistogramToSearchSummaryBuckets(fields, end)(
      response.aggregations.count_by_date.buckets
    );
  } else {
    return [];
  }
}
