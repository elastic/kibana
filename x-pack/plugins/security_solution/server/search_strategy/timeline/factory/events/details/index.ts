/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, merge } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  TimelineEventsQueries,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsDetailsRequestOptions,
} from '../../../../../../common/search_strategy/timeline';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionTimelineFactory } from '../../types';
import { buildTimelineDetailsQuery } from './query.events_details.dsl';
import { getDataFromHits } from './helpers';

export const timelineEventsDetails: SecuritySolutionTimelineFactory<TimelineEventsQueries.details> = {
  buildDsl: (options: TimelineEventsDetailsRequestOptions) => {
    const { indexName, eventId, docValueFields = [] } = options;
    return buildTimelineDetailsQuery(indexName, eventId, docValueFields);
  },
  parse: async (
    options: TimelineEventsDetailsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineEventsDetailsStrategyResponse> => {
    const { indexName, eventId, docValueFields = [] } = options;
    const sourceData = getOr({}, 'hits.hits.0._source', response.rawResponse);
    const hitsData = getOr({}, 'hits.hits.0', response.rawResponse);
    delete hitsData._source;
    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineDetailsQuery(indexName, eventId, docValueFields))],
    };
    const data = getDataFromHits(merge(sourceData, hitsData));

    return {
      ...response,
      data,
      inspect,
    };
  },
};
