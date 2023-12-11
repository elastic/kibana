/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/data-plugin/common';

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { getOr } from 'lodash/fp';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildManagedUserDetailsQuery } from './query.managed_user_details.dsl';

import type { UsersQueries } from '../../../../../../common/search_strategy/security_solution/users';
import type {
  ManagedUserHits,
  ManagedUserDetailsStrategyResponse,
  ManagedUserFields,
  ManagedUserDatasetKey,
} from '../../../../../../common/search_strategy/security_solution/users/managed_details';

interface ManagedUserBucket {
  key: ManagedUserDatasetKey;
  latest_hit: SearchResponse<ManagedUserFields>;
}

export const managedUserDetails: SecuritySolutionFactory<UsersQueries.managedDetails> = {
  buildDsl: (options) => buildManagedUserDetailsQuery(options),
  parse: async (
    options,
    response: IEsSearchResponse<ManagedUserFields>
  ): Promise<ManagedUserDetailsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildManagedUserDetailsQuery(options))],
    };

    const buckets: ManagedUserBucket[] = getOr(
      [],
      'aggregations.datasets.buckets',
      response.rawResponse
    );

    const managedUsers = buckets.reduce<ManagedUserHits>((acc, bucket) => {
      acc[bucket.key] = bucket.latest_hit.hits.hits[0];
      return acc;
    }, {});

    return {
      ...response,
      inspect,
      users: managedUsers,
    };
  },
};
