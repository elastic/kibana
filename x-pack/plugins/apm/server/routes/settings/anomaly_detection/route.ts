/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { maxSuggestions } from '../../../../../observability/common';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { ML_ERRORS } from '../../../../common/anomaly_detection';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { createAnomalyDetectionJobs } from '../../../lib/anomaly_detection/create_anomaly_detection_jobs';
import { setupRequest } from '../../../lib/helpers/setup_request';
import { getAllEnvironments } from '../../environments/get_all_environments';
import { getSearchAggregatedTransactions } from '../../../lib/helpers/transactions';
import { notifyFeatureUsage } from '../../../feature';
import { updateToV3 } from './update_to_v3';
import { environmentStringRt } from '../../../../common/environment_rt';
import { getMlJobsWithAPMGroup } from '../../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { ElasticsearchClient } from '../../../../../../../src/core/server';

// get ML anomaly detection jobs for each environment
const anomalyDetectionJobsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/anomaly-detection/jobs',
  options: {
    tags: ['access:apm', 'access:ml:canGetJobs'],
  },
  handler: async (
    resources
  ): Promise<{
    jobs: Array<
      import('./../../../../common/anomaly_detection/apm_ml_job').ApmMlJob
    >;
    hasLegacyJobs: boolean;
  }> => {
    const setup = await setupRequest(resources);
    const { context } = resources;

    if (!isActivePlatinumLicense(context.licensing.license)) {
      throw Boom.forbidden(ML_ERRORS.INVALID_LICENSE);
    }

    if (!setup.ml) {
      throw Boom.forbidden(ML_ERRORS.ML_NOT_AVAILABLE);
    }

    const jobs = await getMlJobsWithAPMGroup(setup.ml?.anomalyDetectors);

    return {
      jobs,
      hasLegacyJobs: jobs.some((job): boolean => job.version === 1),
    };
  },
});

// create new ML anomaly detection jobs for each given environment
const createAnomalyDetectionJobsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/settings/anomaly-detection/jobs',
  options: {
    tags: ['access:apm', 'access:apm_write', 'access:ml:canCreateJob'],
  },
  params: t.type({
    body: t.type({
      environments: t.array(environmentStringRt),
    }),
  }),
  handler: async (resources): Promise<{ jobCreated: true }> => {
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
  endpoint: 'GET /internal/apm/settings/anomaly-detection/environments',
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ environments: string[] }> => {
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

const anomalyDetectionUpdateToV3Route = createApmServerRoute({
  endpoint: 'POST /internal/apm/settings/anomaly-detection/update_to_v3',
  options: {
    tags: [
      'access:apm',
      'access:apm_write',
      'access:ml:canCreateJob',
      'access:ml:canGetJobs',
      'access:ml:canCloseJob',
    ],
  },
  handler: async (resources): Promise<{ update: boolean }> => {
    const [setup, esClient] = await Promise.all([
      setupRequest(resources),
      resources.core
        .start()
        .then(
          (start): ElasticsearchClient =>
            start.elasticsearch.client.asInternalUser
        ),
    ]);

    const { logger } = resources;

    return {
      update: await updateToV3({ setup, logger, esClient }),
    };
  },
});

export const anomalyDetectionRouteRepository = {
  ...anomalyDetectionJobsRoute,
  ...createAnomalyDetectionJobsRoute,
  ...anomalyDetectionEnvironmentsRoute,
  ...anomalyDetectionUpdateToV3Route,
};
