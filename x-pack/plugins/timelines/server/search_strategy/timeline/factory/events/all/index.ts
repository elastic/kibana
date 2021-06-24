/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../common/constants';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  EventHit,
  TimelineEventsQueries,
  TimelineEventsAllStrategyResponse,
  TimelineEventsAllRequestOptions,
  TimelineEdges,
} from '../../../../../../common/search_strategy';
import { TimelineFactory } from '../../types';
import { buildTimelineEventsAllQuery } from './query.events_all.dsl';
import { TIMELINE_EVENTS_FIELDS } from './constants';
import { buildFieldsRequest, formatTimelineData } from './helpers';
import { inspectStringifyObject } from '../../../../../utils/build_query';

export const timelineEventsAll: TimelineFactory<TimelineEventsQueries.all> = {
  buildDsl: (options: TimelineEventsAllRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const { fieldRequested, ...queryOptions } = cloneDeep(options);
    queryOptions.fields = buildFieldsRequest(fieldRequested, queryOptions.excludeEcsData);
    return buildTimelineEventsAllQuery(queryOptions);
  },
  parse: async (
    options: TimelineEventsAllRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineEventsAllStrategyResponse> => {
    // eslint-disable-next-line prefer-const
    let { fieldRequested, ...queryOptions } = cloneDeep(options);
    queryOptions.fields = buildFieldsRequest(fieldRequested, queryOptions.excludeEcsData);
    const { activePage, querySize } = options.pagination;
    const totalCount = response.rawResponse.hits.total || 0;
    const hits = response.rawResponse.hits.hits;

    if (fieldRequested.includes('*') && hits.length > 0) {
      fieldRequested = Object.keys(hits[0]?.fields ?? {}).reduce((acc, f) => {
        if (!acc.includes(f)) {
          return [...acc, f];
        }
        return acc;
      }, fieldRequested);
    }

    const edges: TimelineEdges[] = await Promise.all(
      hits.map((hit) =>
        formatTimelineData(
          fieldRequested,
          options.excludeEcsData ? [] : TIMELINE_EVENTS_FIELDS,
          hit as EventHit
        )
      )
    );
    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineEventsAllQuery(queryOptions))],
    };

    return {
      ...response,
      inspect,
      edges,
      // @ts-expect-error code doesn't handle TotalHits
      totalCount,
      pageInfo: {
        activePage: activePage ?? 0,
        querySize,
      },
    };
  },
};
