/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { SearchParams } from 'elasticsearch';
import * as Joi from 'joi';

import {
  AdjacentLogEntriesApiPostPayload,
  AdjacentLogEntriesApiPostResponse,
} from '../../common/http_api';
import {
  LogEntry,
  LogEntryFieldsMapping,
  LogEntryTime,
} from '../../common/log_entry';
import {
  InfraBackendFrameworkAdapter,
  InfraDatabaseSearchResponse,
  InfraWrappableRequest,
} from '../lib/infra_types';
import { convertHitToLogEntry } from './converters';
import { SortedHit } from './elasticsearch';
import {
  indicesSchema,
  logEntryFieldsMappingSchema,
  logEntryTimeSchema,
  timestampSchema,
} from './schemas';

const INITIAL_HORIZON_OFFSET = 1000 * 60 * 60 * 24;
const MAX_HORIZON = 9999999999999;

export const initAdjacentLogEntriesRoutes = (
  framework: InfraBackendFrameworkAdapter
) => {
  const callWithRequest = framework.callWithRequest;

  framework.registerRoute<
    InfraWrappableRequest<AdjacentLogEntriesApiPostPayload, {}, {}>,
    AdjacentLogEntriesApiPostResponse
  >({
    config: {
      validate: {
        payload: Joi.object().keys({
          after: timestampSchema.default(0),
          before: timestampSchema.default(0),
          fields: logEntryFieldsMappingSchema.required(),
          indices: indicesSchema.default(['_all']),
          target: logEntryTimeSchema.required(),
        }),
      },
    },
    handler: async (request, reply) => {
      const timings = {
        esRequestSent: Date.now(),
        esResponseProcessed: 0,
      };

      try {
        const search = <Hit>(params: SearchParams) =>
          callWithRequest<Hit>(request, 'search', params);
        const entriesAfterTarget = await fetchAdjacentEntries(
          search,
          request.payload.indices,
          request.payload.fields,
          {
            tiebreaker: request.payload.target.tiebreaker - 1,
            time: request.payload.target.time,
          },
          'asc',
          request.payload.after,
          request.payload.target.time + INITIAL_HORIZON_OFFSET
        );
        const entriesBeforeTarget = (await fetchAdjacentEntries(
          search,
          request.payload.indices,
          request.payload.fields,
          request.payload.target,
          'desc',
          request.payload.before,
          request.payload.target.time - INITIAL_HORIZON_OFFSET
        )).reverse();

        timings.esResponseProcessed = Date.now();

        return reply({
          entries: {
            after: entriesAfterTarget,
            before: entriesBeforeTarget,
          },
          timings,
        });
      } catch (requestError) {
        return reply(Boom.wrap(requestError));
      }
    },
    method: 'POST',
    path: '/api/logging/adjacent-entries',
  });
};

export async function fetchAdjacentEntries(
  search: <Hit>(
    params: SearchParams
  ) => Promise<InfraDatabaseSearchResponse<Hit, any>>,
  indices: string[],
  fields: LogEntryFieldsMapping,
  target: LogEntryTime,
  direction: 'asc' | 'desc',
  size: number,
  horizon: number,
  widenHorizon: boolean = true
): Promise<LogEntry[]> {
  if (size <= 0) {
    return [];
  }

  const response = await search<SortedHit>({
    allowNoIndices: true,
    body: {
      _source: [fields.message],
      query: {
        range: {
          [fields.time]: {
            [direction === 'asc' ? 'gte' : 'lte']: target.time,
            [direction === 'asc' ? 'lte' : 'gte']: horizon,
          },
        },
      },
      search_after: [target.time, target.tiebreaker],
      size,
      sort: [{ [fields.time]: direction }, { [fields.tiebreaker]: direction }],
    },
    ignoreUnavailable: true,
    index: indices,
  });

  const hits = response.hits.hits;
  const nextHorizon = horizon + (horizon - target.time);

  if (
    !widenHorizon ||
    hits.length >= size ||
    nextHorizon < 0 ||
    nextHorizon > MAX_HORIZON
  ) {
    return hits.map(convertHitToLogEntry(fields));
  } else {
    return fetchAdjacentEntries(
      search,
      indices,
      fields,
      target,
      direction,
      size,
      nextHorizon,
      widenHorizon
    );
  }
}
