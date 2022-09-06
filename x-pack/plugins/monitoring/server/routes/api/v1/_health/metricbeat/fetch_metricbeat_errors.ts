/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchParameters, FetchExecution, MonitoredProduct } from '../types';

import type { MetricbeatProducts } from './build_metricbeat_errors';

import { metricbeatErrorsQuery } from './metricbeat_errors_query';
import { buildMetricbeatErrors } from './build_metricbeat_errors';

interface MetricbeatResponse {
  products?: MetricbeatProducts;
  execution: FetchExecution;
}

export const fetchMetricbeatErrors = async ({
  timeout,
  metricbeatIndex,
  timeRange,
  search,
  logger,
}: FetchParameters & {
  metricbeatIndex: string;
}): Promise<MetricbeatResponse> => {
  const getMetricbeatErrors = async () => {
    const { aggregations, timed_out: timedOut } = await search({
      index: metricbeatIndex,
      body: metricbeatErrorsQuery({
        timeRange,
        timeout,
        products: [
          MonitoredProduct.Beats,
          MonitoredProduct.Elasticsearch,
          MonitoredProduct.EnterpriseSearch,
          MonitoredProduct.Kibana,
          MonitoredProduct.Logstash,
        ],
      }),
      size: 0,
      ignore_unavailable: true,
    });
    const buckets = aggregations?.errors_aggregation?.buckets ?? [];
    return { products: buildMetricbeatErrors(buckets), timedOut: Boolean(timedOut) };
  };

  try {
    const { products, timedOut } = await getMetricbeatErrors();
    return {
      products,
      execution: {
        timedOut,
        errors: [],
      },
    };
  } catch (err) {
    logger.error(`fetchMetricbeatErrors: failed to fetch:\n${err.stack}`);
    return {
      execution: {
        timedOut: false,
        errors: [err.message],
      },
    };
  }
};
