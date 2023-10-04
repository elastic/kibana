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

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { UsersQueries } from '../../../../../../../common/search_strategy/security_solution/users';
import type { TotalUsersKpiStrategyResponse } from '../../../../../../../common/search_strategy/security_solution/users/kpi/total_users';

import { inspectStringifyObject } from '../../../../../../utils/build_query';
import type { SecuritySolutionFactory } from '../../../types';
import { buildTotalUsersKpiQuery } from './query.build_total_users_kpi.dsl';
import { formatGeneralHistogramData } from '../../../common/format_general_histogram_data';

export const totalUsersKpi: SecuritySolutionFactory<UsersQueries.kpiTotalUsers> = {
  buildDsl: (options) => buildTotalUsersKpiQuery(options),
  parse: async (
    options,
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
