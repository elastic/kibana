/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionFactory } from '../../types';
import {
  HostsRiskScoreRequestOptions,
  HostsQueries,
  HostsRiskScoreStrategyResponse,
} from '../../../../../../common';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { buildHostsRiskScoreQuery } from './query.hosts_risk.dsl';

export const riskScore: SecuritySolutionFactory<HostsQueries.hostsRiskScore> = {
  buildDsl: (options: HostsRiskScoreRequestOptions) => buildHostsRiskScoreQuery(options),
  parse: async (
    options: HostsRiskScoreRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostsRiskScoreStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildHostsRiskScoreQuery(options))],
    };

    return {
      ...response,
      inspect,
    };
  },
};
