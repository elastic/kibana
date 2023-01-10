/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchParameters, FetchExecution, MonitoredProduct } from '../types';

import type { PackageProducts } from './build_package_errors';

import { packageErrorsQuery } from './package_errors_query';
import { buildPackageErrors } from './build_package_errors';

interface PackageResponse {
  products?: PackageProducts;
  execution: FetchExecution;
}

export const fetchPackageErrors = async ({
  timeout,
  packageIndex,
  timeRange,
  search,
  logger,
}: FetchParameters & {
  packageIndex: string;
}): Promise<PackageResponse> => {
  const getPackageErrors = async () => {
    const { aggregations, timed_out: timedOut } = await search({
      index: packageIndex,
      body: packageErrorsQuery({
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
    return { products: buildPackageErrors(buckets), timedOut: Boolean(timedOut) };
  };

  try {
    const { products, timedOut } = await getPackageErrors();
    return {
      products,
      execution: {
        timedOut,
        errors: [],
      },
    };
  } catch (err) {
    logger.error(`fetchPackageErrors: failed to fetch:\n${err.stack}`);
    return {
      execution: {
        timedOut: false,
        errors: [err.message],
      },
    };
  }
};
