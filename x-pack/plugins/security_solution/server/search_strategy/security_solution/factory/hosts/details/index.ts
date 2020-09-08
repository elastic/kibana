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
  HostDetailsStrategyResponse,
  HostsQueries,
  HostDetailsRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildHostDetailsQuery } from './query.host_details.dsl';
import { formatHostItem } from './helpers';

export const hostDetails: SecuritySolutionFactory<HostsQueries.details> = {
  buildDsl: (options: HostDetailsRequestOptions) => buildHostDetailsQuery(options),
  parse: async (
    options: HostDetailsRequestOptions,
    response: IEsSearchResponse<HostAggEsData>
  ): Promise<HostDetailsStrategyResponse> => {
    const aggregations: HostAggEsItem = get('aggregations', response.rawResponse) || {};
    const inspect = {
      dsl: [inspectStringifyObject(buildHostDetailsQuery(options))],
      response: [inspectStringifyObject(response)],
    };
    const formattedHostItem = formatHostItem(aggregations);
    console.log('-------------');
    console.log(JSON.stringify(options));
    console.log('------2-------');
    console.log(JSON.stringify(response));
    console.log('------3-------');
    console.log(JSON.stringify({ ...response, inspect, hostDetails: formattedHostItem }));
    return { ...response, inspect, hostDetails: formattedHostItem };
  },
};
