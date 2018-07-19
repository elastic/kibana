/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { SearchParams } from 'elasticsearch';
import * as Joi from 'joi';

import {
  LatestLogEntriesApiPostPayload,
  LatestLogEntriesApiPostResponse,
} from '../../common/http_api';
import {
  InfraBackendFrameworkAdapter,
  InfraDatabaseSearchResponse,
  InfraWrappableRequest,
} from '../lib/adapters/framework';
import { fetchAdjacentEntries } from './adjacent_log_entries';
import { indicesSchema, logEntryFieldsMappingSchema, timestampSchema } from './schemas';

const INITIAL_HORIZON_OFFSET = 1000 * 60 * 60;

export const initLatestLogEntriesRoutes = (framework: InfraBackendFrameworkAdapter) => {
  const callWithRequest = framework.callWithRequest;

  framework.registerRoute<
    InfraWrappableRequest<LatestLogEntriesApiPostPayload>,
    LatestLogEntriesApiPostResponse
  >({
    config: {
      validate: {
        payload: Joi.object().keys({
          count: timestampSchema.default(0),
          fields: logEntryFieldsMappingSchema.required(),
          indices: indicesSchema.default(['_all']),
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
        const latestTime = await fetchLatestTime(
          search,
          request.payload.indices,
          request.payload.fields.time
        );
        const latestEntries = (await fetchAdjacentEntries(
          search,
          request.payload.indices,
          request.payload.fields,
          {
            tiebreaker: 9999999999,
            time: latestTime,
          },
          'desc',
          request.payload.count,
          latestTime - INITIAL_HORIZON_OFFSET
        )).reverse();

        timings.esResponseProcessed = Date.now();

        return reply({
          entries: latestEntries,
          timings,
        });
      } catch (requestError) {
        return reply(Boom.wrap(requestError));
      }
    },
    method: 'POST',
    path: '/api/logging/latest-entries',
  });
};

export async function fetchLatestTime(
  search: <Hit, Aggregations>(
    params: SearchParams
  ) => Promise<InfraDatabaseSearchResponse<Hit, Aggregations>>,
  indices: string[],
  timeField: string
): Promise<number> {
  const response = await search<any, { max_time?: { value: number } }>({
    allowNoIndices: true,
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
    ignoreUnavailable: true,
    index: indices,
  });

  if (response.aggregations && response.aggregations.max_time) {
    return response.aggregations.max_time.value;
  } else {
    return 0;
  }
}
