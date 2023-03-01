/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { MlAnomalyDetectors } from '@kbn/ml-plugin/server';
import { getSeverity, ML_ERRORS } from '../../../common/anomaly_detection';
import { ApmMlModule } from '../../../common/anomaly_detection/apm_ml_module';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { Environment } from '../../../common/environment_rt';
import { getServiceHealthStatus } from '../../../common/service_health_status';
import { defaultTransactionTypes } from '../../../common/transaction_types';
import { getAnomalyResults } from '../../lib/anomaly_detection/get_anomaly_results';
import { getMlJobsWithAPMGroup } from '../../lib/anomaly_detection/get_ml_jobs_with_apm_group';
import { MlClient } from '../../lib/helpers/get_ml_client';
import { withApmSpan } from '../../utils/with_apm_span';

export const DEFAULT_ANOMALIES: ServiceAnomaliesResponse = {
  serviceAnomalies: [],
};

export type ServiceAnomaliesResponse = Awaited<
  ReturnType<typeof getServiceAnomalies>
>;
export async function getServiceAnomalies({
  mlClient,
  environment,
  start,
  end,
  serviceName,
}: {
  mlClient: MlClient;
  environment: Environment;
  start: number;
  end: number;
  serviceName?: string;
}) {
  return withApmSpan('get_service_anomalies', async () => {
    if (!mlClient) {
      throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
    }

    const [transactionResults, serviceDestinationResults] = await Promise.all([
      getAnomalyResults({
        mlClient,
        start,
        end,
        environment,
        module: ApmMlModule.Transaction,
        bucketSizeInSeconds: null,
        partition: serviceName,
        by: defaultTransactionTypes,
      }),
      getAnomalyResults({
        mlClient,
        start,
        end,
        environment,
        module: ApmMlModule.ServiceDestination,
        bucketSizeInSeconds: null,
        partition: serviceName,
      }),
    ]);

    const results = transactionResults.concat(serviceDestinationResults);

    return {
      serviceAnomalies: results.map((result) => {
        const severity = getSeverity(result.anomalies.max);
        const healthStatus = getServiceHealthStatus({ severity });

        return {
          serviceName: result.partition,
          transactionType: result.by,
          actualValue: result.anomalies.actual,
          anomalyScore: result.anomalies.max,
          jobId: result.job.jobId,
          healthStatus,
        };
      }),
    };
  });
}

export async function getMLJobs(
  anomalyDetectors: MlAnomalyDetectors,
  environment?: string
) {
  const jobs = await getMlJobsWithAPMGroup(anomalyDetectors);

  // to filter out legacy jobs we are filtering by the existence of `apm_ml_version` in `custom_settings`
  // and checking that it is compatable.
  const mlJobs = jobs.filter((job) => job.version >= 2);
  if (environment && environment !== ENVIRONMENT_ALL.value) {
    return mlJobs.filter((job) => job.environment === environment);
  }
  return mlJobs;
}

export async function getMLJobIds(
  anomalyDetectors: MlAnomalyDetectors,
  environment?: string
) {
  const mlJobs = await getMLJobs(anomalyDetectors, environment);
  return mlJobs.map((job) => job.jobId);
}
