/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery } from '../../../../observability/server';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';
import { getConnectionStatsItemsWithRelativeImpact } from '../../lib/connections/get_connection_stats/get_connection_stats_items_with_relative_impact';
import { Setup } from '../../lib/helpers/setup_request';

export async function getUpstreamServicesForBackend({
  setup,
  start,
  end,
  resourceIdentifierFields,
  numBuckets,
  kuery,
  environment,
  offset,
}: {
  setup: Setup;
  start: number;
  end: number;
  resourceIdentifierFields: Record<string, string>;
  numBuckets: number;
  kuery: string;
  environment: string;
  offset?: string;
}) {
  const resourceIdentifierTerms = Object.entries(resourceIdentifierFields).map(
    (x) => {
      return termQuery(x[0], x[1])[0];
    }
  );

  const statsItems = await getConnectionStats({
    setup,
    start,
    end,
    filter: [
      ...resourceIdentifierTerms,
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
    ],
    collapseBy: 'upstream',
    numBuckets,
    offset,
  });

  return getConnectionStatsItemsWithRelativeImpact(statsItems);
}
