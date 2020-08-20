/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr, merge } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../src/plugins/data/common';

import { FactoryQueryTypes } from '../../../../../common/search_strategy/security_solution';
import {
  HostsStrategyResponse,
  HostDetailsStrategyResponse,
  HostsQueries,
  HostsRequestOptions,
  HostOverviewRequestOptions,
} from '../../../../../common/search_strategy/security_solution/hosts';

import { HostAggEsData } from '../../../../lib/hosts/types';

import { inspectStringifyObject } from '../../../../utils/build_query';
import { SecuritySolutionTimelineFactory } from '../types';
import { buildTimelineDetailsQuery } from './dsl/query.timeline_details.dsl';
import { getDataFromHits } from './helpers';

export const timelineDetails: SecuritySolutionTimelineFactory<'timeline_details'> = {
  buildDsl: (options: HostOverviewRequestOptions) => {
    const { indexName, eventId, docValueFields = [] } = options;
    return buildTimelineDetailsQuery(indexName, eventId, docValueFields);
  },
  parse: async (
    options: HostOverviewRequestOptions,
    response: IEsSearchResponse<HostAggEsData>
  ): Promise<HostDetailsStrategyResponse> => {
    const { indexName, eventId, docValueFields = [] } = options;
    const sourceData = getOr({}, 'hits.hits.0._source', response.rawResponse);
    const hitsData = getOr({}, 'hits.hits.0', response.rawResponse);
    delete hitsData._source;
    const inspect = {
      dsl: [inspectStringifyObject(buildTimelineDetailsQuery(indexName, eventId, docValueFields))],
      response: [inspectStringifyObject(response.rawResponse)],
    };
    const data = getDataFromHits(merge(sourceData, hitsData));

    return {
      data,
      inspect,
    };
  },
};

export const timelineDetailsFactory: Record<
  HostsQueries,
  SecuritySolutionTimelineFactory<FactoryQueryTypes>
> = {
  timeline_details: timelineDetails,
};
