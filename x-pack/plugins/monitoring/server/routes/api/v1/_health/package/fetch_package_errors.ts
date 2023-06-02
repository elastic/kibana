/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FetchParameters, FetchExecution, MonitoredProduct } from '../types';

import type { Products } from '../errors_helpers/build_errors';

import { errorsQuery } from '../errors_helpers/errors_query';
import { buildErrors } from '../errors_helpers/build_errors';

interface PackageResponse {
  products?: Products;
  execution: FetchExecution;
}

export const fetchPackageErrors = async ({
  timeout,
  timeRange,
  search,
  logger,
  packageIndex,
}: FetchParameters & {
  packageIndex: string;
}): Promise<PackageResponse> => {
  const getPackageErrors = async () => {
    const { aggregations, timed_out: timedOut } = await search({
      index: packageIndex,
      body: errorsQuery({
        timeRange,
        timeout,
        products: [
          MonitoredProduct.Beats,
          MonitoredProduct.Elasticsearch,
          MonitoredProduct.Kibana,
          MonitoredProduct.Logstash,
          MonitoredProduct.EnterpriseSearch,
        ],
        errorQueryType: 'packageErrorsQuery',
        errorQueryIsDataStream: true,
      }),
      size: 0,
      ignore_unavailable: true,
    });
    const buckets = aggregations?.errors_aggregation?.buckets ?? [];
    return { products: buildErrors(buckets), timedOut: Boolean(timedOut) };
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
