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
import { ML_ERRORS } from '../../../common/anomaly_detection';
import {
  METRICSET_NAME,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../common/environment_rt';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { withApmSpan } from '../../utils/with_apm_span';
import { Setup } from '../helpers/setup_request';
import { APM_ML_JOB_GROUP, ML_MODULE_ID_APM_TRANSACTION } from './constants';
import { getAnomalyDetectionJobs } from './get_anomaly_detection_jobs';

export async function createAnomalyDetectionJobs(
  setup: Setup,
  environments: Environment[],
  logger: Logger
) {
  const { ml, indices } = setup;

  if (!ml) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  const uniqueMlJobEnvs = await getUniqueMlJobEnvs(setup, environments, logger);
  if (uniqueMlJobEnvs.length === 0) {
    return [];
  }

  return withApmSpan('create_anomaly_detection_jobs', async () => {
    logger.info(
      `Creating ML anomaly detection jobs for environments: [${uniqueMlJobEnvs}].`
    );

    const dataViewName = indices.metric;
    const responses = await Promise.all(
      uniqueMlJobEnvs.map((environment) =>
        createAnomalyDetectionJob({ ml, environment, dataViewName })
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
  ml,
  environment,
  dataViewName,
}: {
  ml: Required<Setup>['ml'];
  environment: string;
  dataViewName: string;
}) {
  return withApmSpan('create_anomaly_detection_job', async () => {
    const randomToken = uuid().substr(-4);

    return ml.modules.setup({
      moduleId: ML_MODULE_ID_APM_TRANSACTION,
      prefix: `${APM_ML_JOB_GROUP}-${snakeCase(environment)}-${randomToken}-`,
      groups: [APM_ML_JOB_GROUP],
      indexPatternName: dataViewName,
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
  setup: Setup,
  environments: Environment[],
  logger: Logger
) {
  // skip creation of duplicate ML jobs
  const jobs = await getAnomalyDetectionJobs(setup);
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
