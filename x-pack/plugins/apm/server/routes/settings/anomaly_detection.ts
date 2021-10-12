/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { maxSuggestions } from '../../../../observability/common';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { createApmServerRoute } from '../create_apm_server_route';
import { getAnomalyDetectionJobs } from '../../lib/anomaly_detection/get_anomaly_detection_jobs';
import { createAnomalyDetectionJobs } from '../../lib/anomaly_detection/create_anomaly_detection_jobs';
import { setupRequest } from '../../lib/helpers/setup_request';
import { getAllEnvironments } from '../../lib/environments/get_all_environments';
import { hasLegacyJobs } from '../../lib/anomaly_detection/has_legacy_jobs';
import { getSearchAggregatedTransactions } from '../../lib/helpers/aggregated_transactions';
import { notifyFeatureUsage } from '../../feature';
import { withApmSpan } from '../../utils/with_apm_span';
import { createApmServerRouteRepository } from '../create_apm_server_route_repository';

// get ML anomaly detection jobs for each environment
const anomalyDetectionJobsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/settings/anomaly-detection/jobs',
  options: {
    tags: ['access:apm', 'access:ml:canGetJobs'],
  },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { context, logger } = resources;

    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(ML_ERRORS.INVALID_LICENSE);
    }

    const [jobs, legacyJobs] = await withApmSpan('get_available_ml_jobs', () =>
      Promise.all([
        getAnomalyDetectionJobs(setup, logger),
        hasLegacyJobs(setup),
      ])
    );

    return {
      jobs,
      hasLegacyJobs: legacyJobs,
    };
  },
});

// create new ML anomaly detection jobs for each given environment
const createAnomalyDetectionJobsRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/settings/anomaly-detection/jobs',
  options: {
    tags: ['access:apm', 'access:apm_write', 'access:ml:canCreateJob'],
  },
  params: t.type({
    body: t.type({
      environments: t.array(t.string),
    }),
  }),
  handler: async (resources) => {
    const { params, context, logger } = resources;
    const { environments } = params.body;

    const setup = await setupRequest(resources);

    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(ML_ERRORS.INVALID_LICENSE);
    }

    await createAnomalyDetectionJobs(setup, environments, logger);

    notifyFeatureUsage({
      licensingPlugin: context.licensing,
      featureName: 'ml',
    });

    return { jobCreated: true };
  },
});

// get all available environments to create anomaly detection jobs for
const anomalyDetectionEnvironmentsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/settings/anomaly-detection/environments',
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      kuery: '',
    });
    const size = await resources.context.core.uiSettings.client.get<number>(
      maxSuggestions
    );
    const environments = await getAllEnvironments({
      includeMissing: true,
      searchAggregatedTransactions,
      setup,
      size,
    });

    return { environments };
  },
});

export const anomalyDetectionRouteRepository = createApmServerRouteRepository()
  .add(anomalyDetectionJobsRoute)
  .add(createAnomalyDetectionJobsRoute)
  .add(anomalyDetectionEnvironmentsRoute);
