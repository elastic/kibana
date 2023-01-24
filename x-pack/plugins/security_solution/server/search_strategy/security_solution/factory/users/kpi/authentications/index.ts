/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { inspectStringifyObject } from '../../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../../types';
import { buildUsersKpiAuthenticationsQuery } from './query.users_kpi_authentications.dsl';
import type {
  UsersKpiAuthenticationsRequestOptions,
  UsersKpiAuthenticationsStrategyResponse,
  UsersQueries,
} from '../../../../../../../common/search_strategy';
import { formatGeneralHistogramData } from '../../../common/format_general_histogram_data';

export const usersKpiAuthentications: SecuritySolutionFactory<UsersQueries.kpiAuthentications> = {
  buildDsl: (options: UsersKpiAuthenticationsRequestOptions) =>
    buildUsersKpiAuthenticationsQuery(options),
  parse: async (
    options: UsersKpiAuthenticationsRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<UsersKpiAuthenticationsStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildUsersKpiAuthenticationsQuery(options))],
    };

    const authenticationsSuccessHistogram = getOr(
      null,
      'aggregations.authentication_success_histogram.buckets',
      response.rawResponse
    );
    const authenticationsFailureHistogram = getOr(
      null,
      'aggregations.authentication_failure_histogram.buckets',
      response.rawResponse
    );

    return {
      ...response,
      inspect,
      authenticationsSuccess: getOr(
        null,
        'aggregations.authentication_success.doc_count',
        response.rawResponse
      ),
      authenticationsSuccessHistogram: formatGeneralHistogramData(authenticationsSuccessHistogram),
      authenticationsFailure: getOr(
        null,
        'aggregations.authentication_failure.doc_count',
        response.rawResponse
      ),
      authenticationsFailureHistogram: formatGeneralHistogramData(authenticationsFailureHistogram),
    };
  },
};
