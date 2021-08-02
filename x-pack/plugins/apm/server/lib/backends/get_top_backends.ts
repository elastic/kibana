/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../connections/get_connection_stats';
import { getConnectionStatsItemsWithRelativeImpact } from '../connections/get_connection_stats/get_connection_stats_items_with_relative_impact';
import { NodeType } from '../../../common/connections';
import { Setup } from '../helpers/setup_request';

export async function getTopBackends({
  setup,
  start,
  end,
  numBuckets,
  environment,
  offset,
}: {
  setup: Setup;
  start: number;
  end: number;
  numBuckets: number;
  environment?: string;
  offset?: string;
}) {
  const statsItems = await getConnectionStats({
    setup,
    start,
    end,
    numBuckets,
    filter: [...environmentQuery(environment)],
    offset,
    collapseBy: 'downstream',
  });

  return getConnectionStatsItemsWithRelativeImpact(
    statsItems.filter((item) => item.location.type !== NodeType.service)
  );
}
