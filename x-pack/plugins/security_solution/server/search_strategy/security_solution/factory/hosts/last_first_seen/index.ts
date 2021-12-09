/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  HostFirstLastSeenStrategyResponse,
  HostsQueries,
  HostFirstLastSeenRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
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
    // If it doesn't exist, fall back on _source as a last try.
    const seen: string | null =
      formattedField || getOr(null, 'hits.hits[0]._source.@timestamp', response.rawResponse);

    const inspect = {
      dsl: [inspectStringifyObject(buildFirstOrLastSeenHostQuery(options))],
    };

    if (options.order === 'asc') {
      return {
        ...response,
        inspect,
        firstSeen: seen,
      };
    } else {
      return {
        ...response,
        inspect,
        lastSeen: seen,
      };
    }
  },
};
