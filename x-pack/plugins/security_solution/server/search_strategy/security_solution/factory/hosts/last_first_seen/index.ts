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
  HostFirstLastSeenStrategyResponse,
  HostsQueries,
  HostFirstLastSeenRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildFirstLastSeenHostQuery } from './query.last_first_seen_host.dsl';

export const firstLastSeenHost: SecuritySolutionFactory<HostsQueries.firstLastSeen> = {
  buildDsl: (options: HostFirstLastSeenRequestOptions) => buildFirstLastSeenHostQuery(options),
  parse: async (
    options: HostFirstLastSeenRequestOptions,
    response: IEsSearchResponse<HostAggEsData>
  ): Promise<HostFirstLastSeenStrategyResponse> => {
    const aggregations: HostAggEsItem = get('aggregations', response.rawResponse) || {};
    const inspect = {
      dsl: [inspectStringifyObject(buildFirstLastSeenHostQuery(options))],
    };

    return {
      ...response,
      inspect,
      firstSeen: get('firstSeen.value_as_string', aggregations),
      lastSeen: get('lastSeen.value_as_string', aggregations),
    };
  },
};
