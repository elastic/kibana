/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, uniq } from 'lodash/fp';

import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  EventHit,
  TimelineEventsQueries,
  TimelineEventsAllStrategyResponse,
  TimelineEventsAllRequestOptions,
  TimelineEdges,
} from '../../../../../../common/search_strategy';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionTimelineFactory } from '../../types';
import { buildTimelineEventsAllQuery } from './query.events_all.dsl';
import { TIMELINE_EVENTS_FIELDS } from './constants';
import { formatTimelineData } from './helpers';

export const timelineEventsAll: SecuritySolutionTimelineFactory<TimelineEventsQueries.all> = {
  buildDsl: (options: TimelineEventsAllRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const { fieldRequested, ...queryOptions } = cloneDeep(options);
    queryOptions.fields = uniq([...fieldRequested, ...TIMELINE_EVENTS_FIELDS]);
    return buildTimelineEventsAllQuery(queryOptions);
  },
  parse: async (
    options: TimelineEventsAllRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineEventsAllStrategyResponse> => {
    const { fieldRequested, ...queryOptions } = cloneDeep(options);
    queryOptions.fields = uniq([...fieldRequested, ...TIMELINE_EVENTS_FIELDS]);
    const { activePage, querySize } = options.pagination;
    const totalCount = response.rawResponse.hits.total || 0;
    const hits = response.rawResponse.hits.hits;
    const edges: TimelineEdges[] = hits.map((hit) =>
      formatTimelineData(options.fieldRequested, TIMELINE_EVENTS_FIELDS, hit as EventHit)
    );
    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineEventsAllQuery(queryOptions))],
    };

    return {
      ...response,
      inspect,
      edges,
      totalCount,
      pageInfo: {
        activePage: activePage ?? 0,
        querySize,
      },
    };
  },
};
