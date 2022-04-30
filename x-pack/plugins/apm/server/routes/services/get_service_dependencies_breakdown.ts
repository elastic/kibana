/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { sortBy, take } from 'lodash';
import { getNodeName } from '../../../common/connections';
import { kqlQuery } from '../../../../observability/server';
import { SERVICE_NAME } from '../../../common/elasticsearch_fieldnames';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Setup } from '../../lib/helpers/setup_request';
import { getConnectionStats } from '../../lib/connections/get_connection_stats';

export async function getServiceDependenciesBreakdown({
  setup,
  start,
  end,
  serviceName,
  environment,
  kuery,
}: {
  setup: Setup;
  start: number;
  end: number;
  serviceName: string;
  environment: string;
  kuery: string;
}) {
  const items = await getConnectionStats({
    setup,
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
