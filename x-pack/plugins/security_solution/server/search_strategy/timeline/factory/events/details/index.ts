/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, merge, unionBy } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  EventHit,
  TimelineEventsQueries,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsDetailsRequestOptions,
} from '../../../../../../common/search_strategy';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionTimelineFactory } from '../../types';
import { buildTimelineDetailsQuery } from './query.events_details.dsl';
import { getDataFromFieldsHits, getDataFromSourceHits } from './helpers';

export const timelineEventsDetails: SecuritySolutionTimelineFactory<TimelineEventsQueries.details> = {
  buildDsl: (options: TimelineEventsDetailsRequestOptions) => {
    const { indexName, eventId, docValueFields = [] } = options;
    return buildTimelineDetailsQuery(indexName, eventId, docValueFields);
  },
  parse: async (
    options: TimelineEventsDetailsRequestOptions,
    response: IEsSearchResponse<EventHit>
  ): Promise<TimelineEventsDetailsStrategyResponse> => {
    const { indexName, eventId, docValueFields = [] } = options;
    const { _source, fields, ...hitsData } = cloneDeep(response.rawResponse.hits.hits[0] ?? {});
    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineDetailsQuery(indexName, eventId, docValueFields))],
    };
    const sourceData = getDataFromSourceHits(_source);
    const fieldsData = getDataFromFieldsHits(merge(fields, hitsData));

    const data = unionBy('field', fieldsData, sourceData);

    return {
      ...response,
      data,
      inspect,
    };
  },
};
