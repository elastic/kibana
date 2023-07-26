/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildObservedUserDetailsQuery } from './query.observed_user_details.dsl';

import type { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type { ObservedUserDetailsStrategyResponse } from '../../../../../../common/search_strategy/security_solution/users/observed_details';
import { formatUserItem } from './helpers';
import { parseOptions } from './parse_options';

export const observedUserDetails: SecuritySolutionFactory<UsersQueries.observedDetails> = {
  buildDsl: (maybeOptions: unknown) => {
    const options = parseOptions(maybeOptions);
    return buildObservedUserDetailsQuery(options);
  },
  parse: async (
    maybeOptions: unknown,
    response: IEsSearchResponse<unknown>
  ): Promise<ObservedUserDetailsStrategyResponse> => {
    const options = parseOptions(maybeOptions);

    const aggregations = response.rawResponse.aggregations;

    const inspect = {
      dsl: [inspectStringifyObject(buildObservedUserDetailsQuery(options))],
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
