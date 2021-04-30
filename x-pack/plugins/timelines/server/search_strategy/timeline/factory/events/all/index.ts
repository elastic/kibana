/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../../../../security_solution/common/constants';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  EventHit,
  TimelineEventsQueries,
  TimelineEventsAllStrategyResponse,
  TimelineEventsAllRequestOptions,
  TimelineEdges,
} from '../../../../../../../security_solution/common/search_strategy';
import { TimelineFactory } from '../../types';
import { buildTimelineEventsAllQuery } from './query.events_all.dsl';
import { TIMELINE_EVENTS_FIELDS } from './constants';
import { buildFieldsRequest, formatTimelineData } from './helpers';
// TODO we need to move this functionality inside of  the plugin
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { inspectStringifyObject } from '../../../../../../../security_solution/server/utils/build_query';

export const timelineEventsAll: TimelineFactory<TimelineEventsQueries.all> = {
  buildDsl: (options: TimelineEventsAllRequestOptions) => {
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const { fieldRequested, ...queryOptions } = cloneDeep(options);
    queryOptions.fields = buildFieldsRequest(fieldRequested);
    return buildTimelineEventsAllQuery(queryOptions);
  },
  parse: async (
    options: TimelineEventsAllRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineEventsAllStrategyResponse> => {
    const { fieldRequested, ...queryOptions } = cloneDeep(options);
    queryOptions.fields = buildFieldsRequest(fieldRequested);
    const { activePage, querySize } = options.pagination;
    const totalCount = response.rawResponse.hits.total || 0;
    const hits = response.rawResponse.hits.hits;
    const edges: TimelineEdges[] = await Promise.all(
      hits.map((hit) =>
        formatTimelineData(options.fieldRequested, TIMELINE_EVENTS_FIELDS, hit as EventHit)
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
