/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  HostAggEsData,
  HostFirstLastSeenStrategyResponse,
  HostsQueries,
  HostFirstLastSeenRequestOptions,
} from '../../../../../../common/search_strategy/security_solution/hosts';

import { inspectStringifyObject } from '../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../types';
import { buildFirstOrLastSeenHostQuery } from './query.first_or_last_seen_host.dsl';

export const firstSeenHost: SecuritySolutionFactory<HostsQueries.firstSeen> = {
  buildDsl: (options: HostFirstLastSeenRequestOptions) => buildFirstOrLastSeenHostQuery(options),
  parse: async (
    options: HostFirstLastSeenRequestOptions,
    response: IEsSearchResponse<HostAggEsData> // TODO: Change this response to match things better
  ): Promise<HostFirstLastSeenStrategyResponse> => {
    // First try to get the formatted field if it exists or not.
    const formattedField: string | null = getOr(
      null,
      'hits.hits[0].fields.@timestamp[0]',
      response.rawResponse
    );
    // If it doesn't exist, fall back on _source as a last try.
    const firstSeen: string | null =
      formattedField || getOr(null, 'hits.hits[0]._source', response.rawResponse);

    const inspect = {
      dsl: [inspectStringifyObject(buildFirstOrLastSeenHostQuery(options))],
    };

    return {
      ...response,
      inspect,
      firstSeen,
    };
  },
};

export const lastSeenHost: SecuritySolutionFactory<HostsQueries.lastSeen> = {
  buildDsl: (options: HostFirstLastSeenRequestOptions) => buildFirstOrLastSeenHostQuery(options),
  parse: async (
    options: HostFirstLastSeenRequestOptions,
    response: IEsSearchResponse<HostAggEsData> // TODO: Change this response to match things better
  ): Promise<HostFirstLastSeenStrategyResponse> => {
    // First try to get the formatted field if it exists or not.
    const formattedField: string | null = getOr(
      null,
      'hits.hits[0].fields.@timestamp[0]',
      response.rawResponse
    );
    // If it doesn't exist, fall back on _source as a last try.
    const lastSeen: string | null =
      formattedField || getOr(null, 'hits.hits[0]._source', response.rawResponse);

    const inspect = {
      dsl: [inspectStringifyObject(buildFirstOrLastSeenHostQuery(options))],
    };

    return {
      ...response,
      inspect,
      lastSeen,
    };
  },
};
