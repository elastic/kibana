/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import type { HostsKpiQueries } from '../../../../../../../common/search_strategy';

import type {
  HostsKpiRiskyHostsRequestOptions,
  HostsKpiRiskyHostsStrategyResponse,
  HostRiskSeverity,
} from '../../../../../../../common/search_strategy/security_solution/hosts/kpi/risky_hosts';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../../types';
import { buildHostsKpiRiskyHostsQuery } from './query.hosts_kpi_risky_hosts.dsl';

interface AggBucket {
  key: HostRiskSeverity;
  doc_count: number;
}

export const hostsKpiRiskyHosts: SecuritySolutionFactory<HostsKpiQueries.kpiRiskyHosts> = {
  buildDsl: (options: HostsKpiRiskyHostsRequestOptions) => buildHostsKpiRiskyHostsQuery(options),
  parse: async (
    options: HostsKpiRiskyHostsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostsKpiRiskyHostsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildHostsKpiRiskyHostsQuery(options))],
    };

    const riskBuckets = getOr([], 'aggregations.risk.buckets', response.rawResponse);

    const riskyHosts: Record<HostRiskSeverity, number> = riskBuckets.reduce(
      (cummulative: Record<string, number>, bucket: AggBucket) => ({
        ...cummulative,
        [bucket.key]: bucket.doc_count,
      }),
      {}
    );

    return {
      ...response,
      riskyHosts,
      inspect,
    };
  },
};
