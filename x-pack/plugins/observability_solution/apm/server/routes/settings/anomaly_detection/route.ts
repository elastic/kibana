/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import Boom from '@hapi/boom';
import { maxSuggestions } from '@kbn/observability-plugin/common';
import { ElasticsearchClient } from '@kbn/core/server';
import { getESCapabilities } from '../../../lib/helpers/get_es_capabilities';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { ML_ERRORS } from '../../../../common/anomaly_detection';
import { createApmServerRoute } from '../../apm_routes/create_apm_server_route';
import { createAnomalyDetectionJobs } from '../../../lib/anomaly_detection/create_anomaly_detection_jobs';
import { getMlClient } from '../../../lib/helpers/get_ml_client';
import { getAllEnvironments } from '../../environments/get_all_environments';
import { getSearchTransactionsEvents } from '../../../lib/helpers/transactions';
import { notifyFeatureUsage } from '../../../feature';
import { updateToV3 } from './update_to_v3';
import { environmentStringRt } from '../../../../common/environment_rt';
import { getMlJobsWithAPMGroup } from '../../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { getApmEventClient } from '../../../lib/helpers/get_apm_event_client';
import { ApmMlJob } from '../../../../common/anomaly_detection/apm_ml_job';
// get ML anomaly detection jobs for each environment
const anomalyDetectionJobsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/settings/anomaly-detection/jobs',
  options: {
    tags: ['access:apm', 'access:ml:canGetJobs'],
  },
  handler: async (
    resources
  ): Promise<{
    jobs: ApmMlJob[];
    hasLegacyJobs: boolean;
  }> => {
    const mlClient = await getMlClient(resources);
    const { context } = resources;
    const licensingContext = await context.licensing;

    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(ML_ERRORS.INVALID_LICENSE);
    }

    if (!mlClient) {
      throw Boom.forbidden(ML_ERRORS.ML_NOT_AVAILABLE);
    }

    const jobs = await getMlJobsWithAPMGroup(mlClient?.anomalyDetectors);

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
    const { params, context, logger, getApmIndices } = resources;
    const { environments } = params.body;
    const licensingContext = await context.licensing;
    const esClient = (await context.core).elasticsearch.client;

    const esCapabilities = await getESCapabilities(resources);

    const [mlClient, indices] = await Promise.all([getMlClient(resources), getApmIndices()]);

    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(ML_ERRORS.INVALID_LICENSE);
    }

    await createAnomalyDetectionJobs({
      mlClient,
      esClient: esClient.asCurrentUser,
      indices,
      environments,
      logger,
      esCapabilities,
    });

    notifyFeatureUsage({
      licensingPlugin: licensingContext,
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
    const apmEventClient = await getApmEventClient(resources);
    const coreContext = await resources.context.core;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config: resources.config,
      kuery: '',
    });
    const size = await coreContext.uiSettings.client.get<number>(maxSuggestions);
    const environments = await getAllEnvironments({
      includeMissing: true,
      searchAggregatedTransactions,
      apmEventClient,
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
    const { getApmIndices } = resources;
    const [indices, mlClient, esClient] = await Promise.all([
      getApmIndices(),
      getMlClient(resources),
      resources.core
        .start()
        .then((start): ElasticsearchClient => start.elasticsearch.client.asInternalUser),
    ]);

    const esCapabilities = await getESCapabilities(resources);

    const { logger } = resources;

    return {
      update: await updateToV3({
        mlClient,
        logger,
        indices,
        esClient,
        esCapabilities,
      }),
    };
  },
});

export const anomalyDetectionRouteRepository = {
  ...anomalyDetectionJobsRoute,
  ...createAnomalyDetectionJobsRoute,
  ...anomalyDetectionEnvironmentsRoute,
  ...anomalyDetectionUpdateToV3Route,
};
