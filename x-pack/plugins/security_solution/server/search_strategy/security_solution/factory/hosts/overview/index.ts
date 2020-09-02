/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  HostAggEsData,
  HostAggEsItem,
  HostOverviewStrategyResponse,
  HostsQueries,
  HostOverviewRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildHostOverviewQuery } from './query.host_overview.dsl';
import { formatHostItem } from './helpers';

export const overviewHost: SecuritySolutionFactory<HostsQueries.hostOverview> = {
  buildDsl: (options: HostOverviewRequestOptions) => {
    return buildHostOverviewQuery(options);
  },
  parse: async (
    options: HostOverviewRequestOptions,
    response: IEsSearchResponse<HostAggEsData>
  ): Promise<HostOverviewStrategyResponse> => {
    const aggregations: HostAggEsItem = get('aggregations', response.rawResponse) || {};
    const inspect = {
      dsl: [inspectStringifyObject(buildHostOverviewQuery(options))],
      response: [inspectStringifyObject(response)],
    };
    const formattedHostItem = formatHostItem(aggregations);

    return { ...response, inspect, hostOverview: formattedHostItem };
  },
};
