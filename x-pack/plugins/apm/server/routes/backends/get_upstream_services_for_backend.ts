/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery } from '@kbn/observability-plugin/server';
import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';
import { getConnectionStatsItemsWithRelativeImpact } from '../../lib/connections/get_connection_stats/get_connection_stats_items_with_relative_impact';
import { Setup } from '../../lib/helpers/setup_request';

export async function getUpstreamServicesForBackend({
  setup,
  start,
  end,
  backendName,
  numBuckets,
  kuery,
  environment,
  offset,
}: {
  setup: Setup;
  start: number;
  end: number;
  backendName: string;
  numBuckets: number;
  kuery: string;
  environment: string;
  offset?: string;
}) {
  const statsItems = await getConnectionStats({
    setup,
    start,
    end,
    filter: [
      { term: { [SPAN_DESTINATION_SERVICE_RESOURCE]: backendName } },
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
    ],
    collapseBy: 'upstream',
    numBuckets,
    offset,
  });

  return getConnectionStatsItemsWithRelativeImpact(statsItems);
}
