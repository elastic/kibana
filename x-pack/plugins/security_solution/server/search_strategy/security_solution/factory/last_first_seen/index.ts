/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { firstLastSeenRequestOptionsSchema } from '../../../../../common/api/search_strategy';
import type {
  FactoryQueryTypes,
  FirstLastSeenStrategyResponse,
} from '../../../../../common/search_strategy/security_solution';
import { FirstLastSeenQuery } from '../../../../../common/search_strategy/security_solution';

import { inspectStringifyObject } from '../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../types';
import { buildFirstOrLastSeenQuery } from './query.first_or_last_seen.dsl';

export const firstOrLastSeen: SecuritySolutionFactory<typeof FirstLastSeenQuery> = {
  buildDsl: (options) => buildFirstOrLastSeenQuery(options),
  parse: async (
    options,
    response: IEsSearchResponse<unknown>
  ): Promise<FirstLastSeenStrategyResponse> => {
    firstLastSeenRequestOptionsSchema.parse(options);

    // First try to get the formatted field if it exists or not.
    const formattedField: string | null = getOr(
      null,
      'hits.hits[0].fields.@timestamp[0]',
      response.rawResponse
    );

    const inspect = {
      dsl: [inspectStringifyObject(buildFirstOrLastSeenQuery(options))],
    };

    const { order } = options;

    if (order === 'asc') {
      return {
        ...response,
        inspect,
        firstSeen: formattedField,
      };
    } else {
      return {
        ...response,
        inspect,
        lastSeen: formattedField,
      };
    }
  },
};

export const firstLastSeenFactory: Record<
  typeof FirstLastSeenQuery,
  SecuritySolutionFactory<FactoryQueryTypes>
> = {
  [FirstLastSeenQuery]: firstOrLastSeen,
};
