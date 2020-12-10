/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, merge } from 'lodash/fp';

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
    const fieldsData = cloneDeep(response.rawResponse.hits.hits[0].fields ?? {});
    const hitsData = cloneDeep(response.rawResponse.hits.hits[0] ?? {});
    delete hitsData._source;
    delete hitsData.fields;
    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineDetailsQuery(indexName, eventId, docValueFields))],
    };
    const data = getDataFromHits(merge(fieldsData, hitsData));

    return {
      ...response,
      data,
      inspect,
    };
  },
};
