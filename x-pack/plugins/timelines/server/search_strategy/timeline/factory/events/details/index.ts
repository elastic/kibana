/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, merge, unionBy } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import {
  EventHit,
  TimelineEventsQueries,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsDetailsItem,
  EventSource,
} from '../../../../../../common/search_strategy';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { TimelineFactory } from '../../types';
import { buildTimelineDetailsQuery } from './query.events_details.dsl';
import {
  getDataFromFieldsHits,
  getDataFromSourceHits,
  getDataSafety,
} from '../../../../../../common/utils/field_formatters';
import { buildEcsObjects } from '../../helpers/build_ecs_objects';

export const timelineEventsDetails: TimelineFactory<TimelineEventsQueries.details> = {
  buildDsl: ({ authFilter, ...options }: TimelineEventsDetailsRequestOptions) => {
    const { indexName, eventId, docValueFields = [], runtimeMappings = {} } = options;
    return buildTimelineDetailsQuery({
      indexName,
      id: eventId,
      docValueFields,
      runtimeMappings,
      authFilter,
    });
  },
  parse: async (
    options: TimelineEventsDetailsRequestOptions,
    response: IEsSearchResponse<EventHit>
  ): Promise<TimelineEventsDetailsStrategyResponse> => {
    const { indexName, eventId, docValueFields = [], runtimeMappings = {} } = options;
    const { _source, fields, ...hitsData } = cloneDeep(response.rawResponse.hits.hits[0] ?? {});
    const inspect = {
      dsl: [
        inspectStringifyObject(
          buildTimelineDetailsQuery({ indexName, id: eventId, docValueFields, runtimeMappings })
        ),
      ],
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
    const ecs = buildEcsObjects(rawEventData as EventHit);

    return {
      ...response,
      data,
      ecs,
      inspect,
      rawEventData,
    };
  },
};
