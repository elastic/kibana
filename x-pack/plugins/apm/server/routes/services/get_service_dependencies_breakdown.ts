/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sortBy, take } from 'lodash';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { getNodeName } from '../../../common/connections';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getServiceDependenciesBreakdown({
  apmEventClient,
  start,
  end,
  serviceName,
  environment,
  kuery,
}: {
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  serviceName: string;
  environment: string;
  kuery: string;
}) {
  const items = await getConnectionStats({
    apmEventClient,
    start,
    end,
    numBuckets: 100,
    collapseBy: 'downstream',
    filter: [
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
      { term: { [SERVICE_NAME]: serviceName } },
    ],
  });

  return take(
    sortBy(items, (item) => item.stats.totalTime ?? 0).reverse(),
    20
  ).map((item) => {
    const { stats, location } = item;

    return {
      title: getNodeName(location),
      data: stats.totalTime.timeseries,
    };
  });
}
