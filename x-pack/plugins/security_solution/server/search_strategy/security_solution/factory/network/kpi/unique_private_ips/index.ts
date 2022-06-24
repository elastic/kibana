/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import {
  NetworkKpiQueries,
  NetworkKpiUniquePrivateIpsStrategyResponse,
  NetworkKpiUniquePrivateIpsRequestOptions,
} from '../../../../../../../common/search_strategy/security_solution/network';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import { SecuritySolutionFactory } from '../../../types';
import { formatHistogramData } from '../common';
import { buildUniquePrivateIpsQuery } from './query.network_kpi_unique_private_ips.dsl';

export const networkKpiUniquePrivateIps: SecuritySolutionFactory<NetworkKpiQueries.uniquePrivateIps> =
  {
    // @ts-expect-error auto_date_histogram.buckets is incompatible
    buildDsl: (options: NetworkKpiUniquePrivateIpsRequestOptions) =>
      buildUniquePrivateIpsQuery(options),
    parse: async (
      options: NetworkKpiUniquePrivateIpsRequestOptions,
      response: IEsSearchResponse<unknown>
    ): Promise<NetworkKpiUniquePrivateIpsStrategyResponse> => {
      const inspect = {
        dsl: [inspectStringifyObject(buildUniquePrivateIpsQuery(options))],
      };

      const uniqueSourcePrivateIpsHistogram = getOr(
        null,
        'aggregations.source.histogram.buckets',
        response.rawResponse
      );
      const uniqueDestinationPrivateIpsHistogram = getOr(
        null,
        'aggregations.destination.histogram.buckets',
        response.rawResponse
      );

      return {
        ...response,
        inspect,
        uniqueSourcePrivateIps: getOr(
          null,
          'aggregations.source.unique_private_ips.value',
          response.rawResponse
        ),
        uniqueDestinationPrivateIps: getOr(
          null,
          'aggregations.destination.unique_private_ips.value',
          response.rawResponse
        ),
        uniqueSourcePrivateIpsHistogram: formatHistogramData(uniqueSourcePrivateIpsHistogram),
        uniqueDestinationPrivateIpsHistogram: formatHistogramData(
          uniqueDestinationPrivateIpsHistogram
        ),
      };
    },
  };
