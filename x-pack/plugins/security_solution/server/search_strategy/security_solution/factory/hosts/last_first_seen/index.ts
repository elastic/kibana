/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  HostFirstLastSeenStrategyResponse,
  HostsQueries,
  HostFirstLastSeenRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../types';
import { buildFirstOrLastSeenHostQuery } from './query.first_or_last_seen_host.dsl';

export const firstOrLastSeenHost: SecuritySolutionFactory<HostsQueries.firstOrLastSeen> = {
  buildDsl: (options: HostFirstLastSeenRequestOptions) => buildFirstOrLastSeenHostQuery(options),
  parse: async (
    options: HostFirstLastSeenRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostFirstLastSeenStrategyResponse> => {
    // First try to get the formatted field if it exists or not.
    const formattedField: string | null = getOr(
      null,
      'hits.hits[0].fields.@timestamp[0]',
      response.rawResponse
    );

    const inspect = {
      dsl: [inspectStringifyObject(buildFirstOrLastSeenHostQuery(options))],
    };

    if (options.order === 'asc') {
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
