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
import { buildRiskyHostsQuery } from './query.risky_hosts.dsl';
import {
  HostsRiskyHostsRequestOptions,
  HostsRiskyHostsStrategyResponse,
} from '../../../../../../common/search_strategy/security_solution/hosts/risky_hosts';

export const riskyHosts: SecuritySolutionFactory<HostsQueries.riskyHosts> = {
  buildDsl: (options: HostsRiskyHostsRequestOptions) => buildRiskyHostsQuery(options),
  // @ts-ignore
  parse: async (
    options: HostsRiskyHostsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostsRiskyHostsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildRiskyHostsQuery(options))],
    };

    return {
      ...response,
      inspect,
    };
  },
};
