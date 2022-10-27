/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { NodeType } from '../../../common/connections';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';
import { getConnectionStatsItemsWithRelativeImpact } from '../../lib/connections/get_connection_stats/get_connection_stats_items_with_relative_impact';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getTopDependencies({
  apmEventClient,
  start,
  end,
  numBuckets,
  environment,
  offset,
  kuery,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  numBuckets: number;
  environment: string;
  offset?: string;
  kuery: string;
}) {
  const statsItems = await getConnectionStats({
    apmEventClient,
    start,
    end,
    numBuckets,
    filter: [...environmentQuery(environment), ...kqlQuery(kuery)],
    offset,
    collapseBy: 'downstream',
  });

  return getConnectionStatsItemsWithRelativeImpact(
    statsItems.filter((item) => item.location.type !== NodeType.service)
  );
}
