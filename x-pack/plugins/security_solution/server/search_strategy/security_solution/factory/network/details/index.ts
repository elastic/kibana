/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';

import {
  NetworkDetailsStrategyResponse,
  NetworkQueries,
  NetworkDetailsRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/network';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';

import { getNetworkDetailsAgg, getNetworkDetailsHostAgg } from './helpers';
import { buildNetworkDetailsQuery } from './query.details_network.dsl';

export const networkDetails: SecuritySolutionFactory<NetworkQueries.details> = {
  buildDsl: (options: NetworkDetailsRequestOptions) => buildNetworkDetailsQuery(options),
  parse: async (
    options: NetworkDetailsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkDetailsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildNetworkDetailsQuery(options))],
    };

    return {
      ...response,
      inspect,
      networkDetails: {
        ...getNetworkDetailsAgg('source', getOr({}, 'aggregations.source', response.rawResponse)),
        ...getNetworkDetailsAgg(
          'destination',
          getOr({}, 'aggregations.destination', response.rawResponse)
        ),
        ...getNetworkDetailsHostAgg(getOr({}, 'aggregations.host', response.rawResponse)),
      },
    };
  },
};
