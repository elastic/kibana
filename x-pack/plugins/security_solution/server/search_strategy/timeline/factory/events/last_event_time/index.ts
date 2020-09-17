/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  TimelineEventsQueries,
  TimelineEventsLastEventTimeStrategyResponse,
  TimelineEventsLastEventTimeRequestOptions,
} from '../../../../../../common/search_strategy/timeline';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionTimelineFactory } from '../../types';
import { buildLastEventTimeQuery } from './query.events_last_event_time.dsl';

export const timelineEventsLastEventTime: SecuritySolutionTimelineFactory<TimelineEventsQueries.lastEventTime> = {
  buildDsl: (options: TimelineEventsLastEventTimeRequestOptions) =>
    buildLastEventTimeQuery(options),
  parse: async (
    options: TimelineEventsLastEventTimeRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineEventsLastEventTimeStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildLastEventTimeQuery(options))],
    };

    return {
      ...response,
      lastSeen: getOr(null, 'aggregations.last_seen_event.value_as_string', response.rawResponse),
      inspect,
    };
  },
};
