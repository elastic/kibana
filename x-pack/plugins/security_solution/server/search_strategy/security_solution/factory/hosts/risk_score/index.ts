/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecuritySolutionFactory } from '../../types';
import { HostsQueries } from '../../../../../../common';
import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import { buildRiskScoreQuery } from './query.risk_score.dsl';
import {
  HostRiskScoreRequestOptions,
  HostRiskScoreStrategyResponse,
} from '../../../../../../common/search_strategy/security_solution/hosts/risk_score';

export const riskScore: SecuritySolutionFactory<HostsQueries.riskScore> = {
  buildDsl: (options: HostRiskScoreRequestOptions) => buildRiskScoreQuery(options),
  parse: async (
    options: HostRiskScoreRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostRiskScoreStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildRiskScoreQuery(options))],
    };

    return {
      ...response,
      inspect,
    };
  },
};
