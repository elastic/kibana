/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import type {
  NetworkDetailsStrategyResponse,
  NetworkQueries,
  NetworkDetailsRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/network';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';

import { getNetworkDetailsAgg } from './helpers';
import { buildNetworkDetailsQuery } from './query.details_network.dsl';
import { unflattenObject } from '../../../../helpers/format_response_object_values';

export const networkDetails: SecuritySolutionFactory<NetworkQueries.details> = {
  buildDsl: (options: NetworkDetailsRequestOptions) => buildNetworkDetailsQuery(options),
  parse: async (
    options: NetworkDetailsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<NetworkDetailsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildNetworkDetailsQuery(options))],
    };

    const hostDetailsHit = getOr({}, 'aggregations.host', response.rawResponse);
    const hostFields = unflattenObject(
      getOr({}, `results.hits.hits[0].fields`, { ...hostDetailsHit })
    );

    return {
      ...response,
      inspect,
      networkDetails: {
        ...hostFields,
        ...getNetworkDetailsAgg('source', {
          ...getOr({}, 'aggregations.source', response.rawResponse),
        }),
        ...getNetworkDetailsAgg('destination', {
          ...getOr({}, 'aggregations.destination', response.rawResponse),
        }),
      },
    };
  },
};
