/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';
import { getConnectionStatsItemsWithRelativeImpact } from '../../lib/connections/get_connection_stats/get_connection_stats_items_with_relative_impact';
import { Setup } from '../../lib/helpers/setup_request';

export async function getServiceDependencies({
  setup,
  start,
  end,
  serviceName,
  numBuckets,
  environment,
  offset,
}: {
  setup: Setup;
  start: number;
  end: number;
  serviceName: string;
  numBuckets: number;
  environment: string;
  offset?: string;
}) {
  const statsItems = await getConnectionStats({
    setup,
    start,
    end,
    numBuckets,
    filter: [
      { term: { [SERVICE_NAME]: serviceName } },
      ...environmentQuery(environment),
    ],
    offset,
    collapseBy: 'downstream',
  });

  return getConnectionStatsItemsWithRelativeImpact(statsItems);
}
