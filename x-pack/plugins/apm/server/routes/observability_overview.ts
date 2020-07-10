/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceCount } from '../lib/observability_overview/get_service_count';
import { getTransactionCoordinates } from '../lib/observability_overview/get_transaction_coordinates';
import { hasData } from '../lib/observability_overview/has_data';
import { createRoute } from './create_route';
import { rangeRt } from './default_api_types';

export const observabilityOverviewHasDataRoute = createRoute(() => ({
  path: '/api/apm/observability_overview/has_data',
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    return await hasData({ setup });
  },
}));

export const observabilityOverviewRoute = createRoute(() => ({
  path: '/api/apm/observability_overview',
  params: {
    query: t.intersection([rangeRt, t.type({ bucketSize: t.string })]),
  },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { bucketSize } = context.params.query;
    const serviceCountPromise = getServiceCount({ setup });
    const transactionCoordinatesPromise = getTransactionCoordinates({
      setup,
      bucketSize,
    });
    const [serviceCount, transactionCoordinates] = await Promise.all([
      serviceCountPromise,
      transactionCoordinatesPromise,
    ]);
    return { serviceCount, transactionCoordinates };
  },
}));
