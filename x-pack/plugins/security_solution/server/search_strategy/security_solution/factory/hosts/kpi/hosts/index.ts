/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import {
  HostsKpiQueries,
  HostsKpiHostsStrategyResponse,
  HostsKpiHostsRequestOptions,
} from '../../../../../../../common/search_strategy/security_solution/hosts';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../../types';
import { buildHostsKpiHostsQuery } from './query.hosts_kpi_hosts.dsl';
import { formatGeneralHistogramData } from '../common';

export const hostsKpiHosts: SecuritySolutionFactory<HostsKpiQueries.kpiHosts> = {
  buildDsl: (options: HostsKpiHostsRequestOptions) => buildHostsKpiHostsQuery(options),
  parse: async (
    options: HostsKpiHostsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<HostsKpiHostsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildHostsKpiHostsQuery(options))],
    };

    const hostsHistogram = getOr(
      null,
      'aggregations.hosts_histogram.buckets',
      response.rawResponse
    );
    return {
      ...response,
      inspect,
      hosts: getOr(null, 'aggregations.hosts.value', response.rawResponse),
      hostsHistogram: formatGeneralHistogramData(hostsHistogram),
    };
  },
};
