/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildManagedUserDetailsQuery } from './query.managed_user_details.dsl';

import type { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type {
  AzureManagedUser,
  ManagedUserDetailsStrategyResponse,
} from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import { parseOptions } from './parse_options';

export const managedUserDetails: SecuritySolutionFactory<UsersQueries.managedDetails> = {
  buildDsl: (maybeOptions: unknown) => {
    const options = parseOptions(maybeOptions);
    return buildManagedUserDetailsQuery(options);
  },
  parse: async (
    maybeOptions: unknown,
    response: IEsSearchResponse<AzureManagedUser>
  ): Promise<ManagedUserDetailsStrategyResponse> => {
    const options = parseOptions(maybeOptions);

    const inspect = {
      dsl: [inspectStringifyObject(buildManagedUserDetailsQuery(options))],
    };

    const hits = response.rawResponse.hits.hits;
    const userDetails = hits.length > 0 ? hits[0]._source : undefined;

    return {
      ...response,
      inspect,
      userDetails,
    };
  },
};
