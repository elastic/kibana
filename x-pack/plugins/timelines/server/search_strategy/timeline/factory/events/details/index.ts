/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, merge, unionBy } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  EventHit,
  TimelineEventsQueries,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsDetailsItem,
  EventSource,
} from '../../../../../../common/search_strategy';
import { inspectStringifyObject } from '../../../../../../server/utils/build_query';
import { TimelineFactory } from '../../types';
import { buildTimelineDetailsQuery } from './query.events_details.dsl';
import {
  getDataFromFieldsHits,
  getDataFromSourceHits,
  getDataSafety,
} from '../../../../../../common/utils/field_formatters';

export const timelineEventsDetails: TimelineFactory<TimelineEventsQueries.details> = {
  buildDsl: ({ authFilter, ...options }: TimelineEventsDetailsRequestOptions) => {
    const { indexName, eventId, docValueFields = [] } = options;
    return buildTimelineDetailsQuery(indexName, eventId, docValueFields, authFilter);
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
    if (response.isRunning) {
      return {
        ...response,
        data: [],
        inspect,
      };
    }
    const sourceData = await getDataSafety<EventSource, TimelineEventsDetailsItem[]>(
      getDataFromSourceHits,
      // @ts-expect-error @elastic/elasticsearch _source is optional
      _source
    );
    const fieldsData = await getDataSafety<EventHit['fields'], TimelineEventsDetailsItem[]>(
      getDataFromFieldsHits,
      merge(fields, hitsData)
    );

    const data = unionBy('field', fieldsData, sourceData);

    const rawEventData = response.rawResponse.hits.hits[0];

    return {
      ...response,
      data,
      inspect,
      rawEventData,
    };
  },
};
