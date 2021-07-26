/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { environmentQuery } from '../../../common/utils/environment_query';
import { getConnectionMetrics } from '../connections/get_connection_metrics';
import { getConnectionMetricItemsWithRelativeImpact } from '../connections/get_connection_metrics/get_connection_metric_items_with_relative_impact';
import { NodeType } from '../connections/types';
import { Setup } from '../helpers/setup_request';

export async function getTopBackends({
  setup,
  start,
  end,
  numBuckets,
  environment,
}: {
  setup: Setup;
  start: number;
  end: number;
  numBuckets: number;
  environment?: string;
}) {
  const metricItems = await getConnectionMetrics({
    setup,
    start,
    end,
    numBuckets,
    filter: [...environmentQuery(environment)],
  });

  return getConnectionMetricItemsWithRelativeImpact(
    metricItems.filter((item) => item.to.type !== NodeType.service)
  );
}
