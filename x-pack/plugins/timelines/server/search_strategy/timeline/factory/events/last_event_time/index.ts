/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  TimelineEventsQueries,
  TimelineEventsLastEventTimeStrategyResponse,
  TimelineEventsLastEventTimeRequestOptions,
} from '../../../../../../common/search_strategy/timeline';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { TimelineFactory } from '../../types';
import { buildLastEventTimeQuery } from './query.events_last_event_time.dsl';

export const timelineEventsLastEventTime: TimelineFactory<TimelineEventsQueries.lastEventTime> = {
  buildDsl: (options: TimelineEventsLastEventTimeRequestOptions) =>
    buildLastEventTimeQuery(options),
  parse: async (
    options: TimelineEventsLastEventTimeRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineEventsLastEventTimeStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildLastEventTimeQuery(options))],
    };

    // First try to get the formatted field if it exists or not.
    const formattedField: string | null = getOr(
      null,
      'hits.hits[0].fields.@timestamp[0]',
      response.rawResponse
    );
    // If it doesn't exist, fall back on _source as a last try.
    const lastSeen: string | null =
      formattedField || getOr(null, 'hits.hits[0]._source.@timestamp', response.rawResponse);

    return {
      ...response,
      lastSeen,
      inspect,
    };
  },
};
