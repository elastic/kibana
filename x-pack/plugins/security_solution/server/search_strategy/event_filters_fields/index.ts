/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import type { ISearchStrategy, SearchStrategyDependencies } from '@kbn/data-plugin/server';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';

import {
  formatIndexFields,
  dedupeIndexName,
  findExistingIndices,
} from '@kbn/timelines-plugin/server/search_strategy/index_fields';

import type {
  BeatFields,
  IndexField,
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse,
} from '../../../common/search_strategy';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';

/**
 * EventFiltersFieldProvider mimics indexField provider from timeline plugin: x-pack/plugins/timelines/server/search_strategy/index_fields/index.ts
 * but it uses ES internalUser instead to avoid adding extra index privileges for users with event filters permissions.
 * It is used to retrieve index patterns for event filters form.
 */
export const eventFiltersFieldsProvider = (
  context: EndpointAppContextService
): ISearchStrategy<IndexFieldsStrategyRequest<'indices'>, IndexFieldsStrategyResponse> => {
  // require the fields once we actually need them, rather than ahead of time, and pass
  // them to createFieldItem to reduce the amount of work done as much as possible
  const beatFields: BeatFields =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@kbn/timelines-plugin/server/utils/beat_schema/fields').fieldsBeat;

  return {
    search: (request, _, deps) =>
      from(requestEventFiltersFieldsSearch(request, deps, beatFields, context)),
  };
};

export const requestEventFiltersFieldsSearch = async (
  request: IndexFieldsStrategyRequest<'indices'>,
  { esClient, request: kibanaRequest }: SearchStrategyDependencies,
  beatFields: BeatFields,
  context: EndpointAppContextService
): Promise<IndexFieldsStrategyResponse> => {
  const { canWriteEventFilters } = await context.getEndpointAuthz(kibanaRequest);

  if (!canWriteEventFilters) {
    throw new Error('Endpoint authz error');
  }

  if (request.indices.length > 1 || request.indices[0] !== 'logs-endpoint.events.*') {
    throw new Error(`Invalid indices request ${request.indices.join(', ')}`);
  }

  const indexPatternsFetcherAsInternalUser = new IndexPatternsFetcher(esClient.asInternalUser);

  let indicesExist: string[] = [];
  let indexFields: IndexField[] = [];

  const patternList = dedupeIndexName(request.indices);
  indicesExist = (await findExistingIndices(patternList, esClient.asInternalUser)).reduce(
    (acc: string[], doesIndexExist, i) => (doesIndexExist ? [...acc, patternList[i]] : acc),
    []
  );
  if (!request.onlyCheckIfIndicesExist) {
    const fieldDescriptor = (
      await Promise.all(
        indicesExist.map(async (index) =>
          indexPatternsFetcherAsInternalUser.getFieldsForWildcard({
            pattern: index,
          })
        )
      )
    ).map((response) => response.fields || []);
    indexFields = await formatIndexFields(beatFields, fieldDescriptor, patternList);
  }

  return {
    indexFields,
    runtimeMappings: {},
    indicesExist,
    rawResponse: {
      timed_out: false,
      took: -1,
      _shards: {
        total: -1,
        successful: -1,
        failed: -1,
        skipped: -1,
      },
      hits: {
        total: -1,
        max_score: -1,
        hits: [
          {
            _index: '',
            _id: '',
            _score: -1,
            fields: {},
          },
        ],
      },
    },
  };
};
