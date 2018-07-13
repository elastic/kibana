/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import { SearchParams } from 'elasticsearch';
import * as Joi from 'joi';

import {
  ContainedSearchResultsApiPostPayload,
  ContainedSearchResultsApiPostResponse,
} from '../../common/http_api';
import { isLessOrEqual, LogEntryFieldsMapping, LogEntryTime } from '../../common/log_entry';
import { SearchResult } from '../../common/log_search_result';
import {
  InfraBackendFrameworkAdapter,
  InfraDatabaseSearchResponse,
  InfraWrappableRequest,
} from '../lib/adapters/framework';
import { convertHitToSearchResult } from './converters';
import { isHighlightedHit, SortedHit } from './elasticsearch';
import { indicesSchema, logEntryFieldsMappingSchema, logEntryTimeSchema } from './schemas';

export const initContainedSearchResultsRoutes = (framework: InfraBackendFrameworkAdapter) => {
  const callWithRequest = framework.callWithRequest;

  framework.registerRoute<
    InfraWrappableRequest<ContainedSearchResultsApiPostPayload>,
    ContainedSearchResultsApiPostResponse
  >({
    config: {
      validate: {
        payload: Joi.object().keys({
          end: logEntryTimeSchema.required(),
          fields: logEntryFieldsMappingSchema.required(),
          indices: indicesSchema.required(),
          query: Joi.string().required(),
          start: logEntryTimeSchema.required(),
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

        const searchResults = await fetchSearchResultsBetween(
          search,
          request.payload.indices,
          request.payload.fields,
          request.payload.start,
          request.payload.end,
          request.payload.query
        );

        timings.esResponseProcessed = Date.now();

        return reply({
          results: searchResults,
          timings,
        });
      } catch (requestError) {
        return reply(Boom.wrap(requestError));
      }
    },
    method: 'POST',
    path: '/api/logging/contained-search-results',
  });
};

export async function fetchSearchResultsBetween(
  search: <Hit>(params: SearchParams) => Promise<InfraDatabaseSearchResponse<Hit, any>>,
  indices: string[],
  fields: LogEntryFieldsMapping,
  start: LogEntryTime,
  end: LogEntryTime,
  query: string
): Promise<SearchResult[]> {
  const request = {
    allowNoIndices: true,
    body: {
      _source: false,
      highlight: {
        boundary_scanner: 'word',
        fields: {
          [fields.message]: {},
        },
        fragment_size: 1,
        number_of_fragments: 100,
        post_tags: [''],
        pre_tags: [''],
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
                  gte: start.time,
                  lte: end.time,
                },
              },
            },
          ],
        },
      },
      search_after: [start.time, start.tiebreaker - 1],
      size: 10000,
      sort: [{ [fields.time]: 'asc' }, { [fields.tiebreaker]: 'asc' }],
    },
    ignoreUnavailable: true,
    index: indices,
  };
  const response = await search<SortedHit>(request);

  const hits = response.hits.hits as SortedHit[];
  const filteredHits = hits
    .filter(hit => isLessOrEqual({ time: hit.sort[0], tiebreaker: hit.sort[1] }, end))
    .filter(isHighlightedHit);
  return filteredHits.map(convertHitToSearchResult(fields));
}
