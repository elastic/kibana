/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { kqlQuery, rangeQuery } from '../../../alerts_and_slos/utils/queries';
import { CommonCorrelationsQueryParams } from '../../../../../../common/features/apm/correlations/types';
import { environmentQuery } from '../../../../../../common/features/apm/utils/environment_query';

export function getCommonCorrelationsQuery({
  start,
  end,
  kuery,
  query,
  environment,
}: CommonCorrelationsQueryParams): QueryDslQueryContainer {
  return {
    bool: {
      filter: [
        query,
        ...rangeQuery(start, end),
        ...environmentQuery(environment),
        ...kqlQuery(kuery),
      ],
    },
  };
}
