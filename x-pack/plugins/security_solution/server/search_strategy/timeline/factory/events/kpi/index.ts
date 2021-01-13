/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  TimelineEventsQueries,
  TimelineRequestBasicOptions,
  TimelineKpiStrategyResponse,
} from '../../../../../../common/search_strategy/timeline';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionTimelineFactory } from '../../types';
import { buildTimelineKpiQuery } from './query.kpi.dsl';

export const timelineKpi: SecuritySolutionTimelineFactory<TimelineEventsQueries.kpi> = {
  buildDsl: (options: TimelineRequestBasicOptions) => buildTimelineKpiQuery(options),
  parse: async (
    options: TimelineRequestBasicOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<TimelineKpiStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineKpiQuery(options))],
    };

    return {
      ...response,
      destinationIpCount: 0,
      inspect,
      hostCount: 0,
      processCount: 0,
      sourceIpCount: 0,
      userCount: getOr(0, 'aggregations.userCount.value', response.rawResponse),
    };
  },
};
