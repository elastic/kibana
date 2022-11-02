/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { Logger } from '@kbn/core/server';
import { snakeCase } from 'lodash';
import moment from 'moment';
import uuid from 'uuid/v4';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import {
  METRICSET_NAME,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../common/environment_rt';
import { environmentQuery } from '../../../common/utils/environment_query';
import { withApmSpan } from '../../utils/with_apm_span';
import { MlClient } from '../helpers/get_ml_client';
import { APM_ML_JOB_GROUP, ML_MODULE_ID_APM_TRANSACTION } from './constants';
import { getAnomalyDetectionJobs } from './get_anomaly_detection_jobs';
import { ApmIndicesConfig } from '../../routes/settings/apm_indices/get_apm_indices';

export async function createAnomalyDetectionJobs({
  mlSetup,
  indices,
  environments,
  logger,
}: {
  mlSetup?: MlClient;
  indices: ApmIndicesConfig;
  environments: Environment[];
  logger: Logger;
}) {
  if (!mlSetup) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  const uniqueMlJobEnvs = await getUniqueMlJobEnvs(
    mlSetup,
    environments,
    logger
  );
  if (uniqueMlJobEnvs.length === 0) {
    return [];
  }

  return withApmSpan('create_anomaly_detection_jobs', async () => {
    logger.info(
      `Creating ML anomaly detection jobs for environments: [${uniqueMlJobEnvs}].`
    );

    const apmMetricIndex = indices.metric;
    const responses = await Promise.all(
      uniqueMlJobEnvs.map((environment) =>
        createAnomalyDetectionJob({ mlSetup, environment, apmMetricIndex })
      )
    );

    const jobResponses = responses.flatMap((response) => response.jobs);
    const failedJobs = jobResponses.filter(({ success }) => !success);

    if (failedJobs.length > 0) {
      const errors = failedJobs.map(({ id, error }) => ({ id, error }));
      throw new Error(
        `An error occurred while creating ML jobs: ${JSON.stringify(errors)}`
      );
    }

    return jobResponses;
  });
}

async function createAnomalyDetectionJob({
  mlSetup,
  environment,
  apmMetricIndex,
}: {
  mlSetup: Required<MlClient>;
  environment: string;
  apmMetricIndex: string;
}) {
  return withApmSpan('create_anomaly_detection_job', async () => {
    const randomToken = uuid().substr(-4);

    return mlSetup.modules.setup({
      moduleId: ML_MODULE_ID_APM_TRANSACTION,
      prefix: `${APM_ML_JOB_GROUP}-${snakeCase(environment)}-${randomToken}-`,
      groups: [APM_ML_JOB_GROUP],
      indexPatternName: apmMetricIndex,
      applyToAllSpaces: true,
      start: moment().subtract(4, 'weeks').valueOf(),
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.metric } },
            { term: { [METRICSET_NAME]: 'transaction' } },
            ...environmentQuery(environment),
          ],
        },
      },
      startDatafeed: true,
      jobOverrides: [
        {
          custom_settings: {
            job_tags: {
              environment,
              // identifies this as an APM ML job & facilitates future migrations
              apm_ml_version: 3,
            },
          },
        },
      ],
    });
  });
}

async function getUniqueMlJobEnvs(
  mlSetup: MlClient,
  environments: Environment[],
  logger: Logger
) {
  // skip creation of duplicate ML jobs
  const jobs = await getAnomalyDetectionJobs(mlSetup);
  const existingMlJobEnvs = jobs
    .filter((job) => job.version === 3)
    .map(({ environment }) => environment);

  const requestedExistingMlJobEnvs = environments.filter((env) =>
    existingMlJobEnvs.includes(env)
  );

  if (requestedExistingMlJobEnvs.length) {
    logger.warn(
      `Skipping creation of existing ML jobs for environments: [${requestedExistingMlJobEnvs}]}`
    );
  }

  return environments.filter((env) => !existingMlJobEnvs.includes(env));
}
