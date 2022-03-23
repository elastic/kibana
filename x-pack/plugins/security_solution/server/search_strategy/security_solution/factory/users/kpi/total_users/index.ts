/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../../src/plugins/data/common';
import { UsersQueries } from '../../../../../../../common/search_strategy/security_solution/users';
import {
  TotalUsersKpiRequestOptions,
  TotalUsersKpiStrategyResponse,
} from '../../../../../../../common/search_strategy/security_solution/users/kpi/total_users';

import { inspectStringifyObject } from '../../../../../../utils/build_query';
import { formatGeneralHistogramData } from '../../../hosts/kpi';
import { SecuritySolutionFactory } from '../../../types';
import { buildTotalUsersKpiQuery } from './query.build_total_users_kpi.dsl';

export const totalUsersKpi: SecuritySolutionFactory<UsersQueries.kpiTotalUsers> = {
  buildDsl: (options: TotalUsersKpiRequestOptions) => buildTotalUsersKpiQuery(options),
  parse: async (
    options: TotalUsersKpiRequestOptions,
    response: IEsSearchResponse<unknown>
  ): Promise<TotalUsersKpiStrategyResponse> => {
    const inspect = {
      dsl: [inspectStringifyObject(buildTotalUsersKpiQuery(options))],
    };

    const usersHistogram = getOr(
      null,
      'aggregations.users_histogram.buckets',
      response.rawResponse
    );
    return {
      ...response,
      inspect,
      users: getOr(null, 'aggregations.users.value', response.rawResponse),
      usersHistogram: formatGeneralHistogramData(usersHistogram),
    };
  },
};
