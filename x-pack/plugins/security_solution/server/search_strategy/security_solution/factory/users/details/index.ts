/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildUserDetailsQuery } from './query.user_details.dsl';

import type { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type {
  UserDetailsRequestOptions,
  UserDetailsStrategyResponse,
} from '../../../../../../common/search_strategy/security_solution/users/details';
import { formatUserItem } from './helpers';

export const userDetails: SecuritySolutionFactory<UsersQueries.details> = {
  buildDsl: (options: UserDetailsRequestOptions) => buildUserDetailsQuery(options),
  parse: async (
    options: UserDetailsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<UserDetailsStrategyResponse> => {
    const aggregations = response.rawResponse.aggregations;

    const inspect = {
      dsl: [inspectStringifyObject(buildUserDetailsQuery(options))],
    };

    if (aggregations == null) {
      return { ...response, inspect, userDetails: {} };
    }

    return {
      ...response,
      inspect,
      userDetails: formatUserItem(aggregations),
    };
  },
};
