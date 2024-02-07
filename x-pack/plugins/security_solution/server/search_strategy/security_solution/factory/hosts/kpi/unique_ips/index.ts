/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  HostsKpiQueries,
  HostsKpiUniqueIpsStrategyResponse,
} from '../../../../../../../common/search_strategy/security_solution/hosts';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../../types';
import { buildHostsKpiUniqueIpsQuery } from './query.hosts_kpi_unique_ips.dsl';
import { formatGeneralHistogramData } from '../../../common/format_general_histogram_data';

export const hostsKpiUniqueIps: SecuritySolutionFactory<HostsKpiQueries.kpiUniqueIps> = {
  buildDsl: (options) => buildHostsKpiUniqueIpsQuery(options),
  parse: async (
    options,
    response: IEsSearchResponse<unknown>
  ): Promise<HostsKpiUniqueIpsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildHostsKpiUniqueIpsQuery(options))],
    };

    const uniqueSourceIpsHistogram = getOr(
      null,
      'aggregations.unique_source_ips_histogram.buckets',
      response.rawResponse
    );

    const uniqueDestinationIpsHistogram = getOr(
      null,
      'aggregations.unique_destination_ips_histogram.buckets',
      response.rawResponse
    );

    return {
      ...response,
      inspect,
      uniqueSourceIps: getOr(null, 'aggregations.unique_source_ips.value', response.rawResponse),
      uniqueSourceIpsHistogram: formatGeneralHistogramData(uniqueSourceIpsHistogram),
      uniqueDestinationIps: getOr(
        null,
        'aggregations.unique_destination_ips.value',
        response.rawResponse
      ),
      uniqueDestinationIpsHistogram: formatGeneralHistogramData(uniqueDestinationIpsHistogram),
    };
  },
};
