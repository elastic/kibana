/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import uuid from 'uuid/v4';
import { snakeCase } from 'lodash';
import Boom from '@hapi/boom';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { Setup } from '../helpers/setup_request';
import {
  TRANSACTION_DURATION,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { APM_ML_JOB_GROUP, ML_MODULE_ID_APM_TRANSACTION } from './constants';
import { withApmSpan } from '../../utils/with_apm_span';
import { getAnomalyDetectionJobs } from './get_anomaly_detection_jobs';

export async function createAnomalyDetectionJobs(
  setup: Setup,
  environments: string[],
  logger: Logger
) {
  const { ml, indices } = setup;

  if (!ml) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  const mlCapabilities = await withApmSpan('get_ml_capabilities', () =>
    ml.mlSystem.mlCapabilities()
  );
  if (!mlCapabilities.mlFeatureEnabledInSpace) {
    throw Boom.forbidden(ML_ERRORS.ML_NOT_AVAILABLE_IN_SPACE);
  }

  const uniqueMlJobEnvs = await getUniqueMlJobEnvs(setup, environments, logger);
  if (uniqueMlJobEnvs.length === 0) {
    return [];
  }

  return withApmSpan('create_anomaly_detection_jobs', async () => {
    logger.info(
      `Creating ML anomaly detection jobs for environments: [${uniqueMlJobEnvs}].`
    );

    const indexPatternName = indices['apm_oss.transactionIndices'];
    const responses = await Promise.all(
      uniqueMlJobEnvs.map((environment) =>
        createAnomalyDetectionJob({ ml, environment, indexPatternName })
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
  indexPatternName,
}: {
  ml: Required<Setup>['ml'];
  environment: string;
  indexPatternName: string;
}) {
  return withApmSpan('create_anomaly_detection_job', async () => {
    const randomToken = uuid().substr(-4);

    return ml.modules.setup({
      moduleId: ML_MODULE_ID_APM_TRANSACTION,
      prefix: `${APM_ML_JOB_GROUP}-${snakeCase(environment)}-${randomToken}-`,
      groups: [APM_ML_JOB_GROUP],
      indexPatternName,
      applyToAllSpaces: true,
      query: {
        bool: {
          filter: [
            { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
            { exists: { field: TRANSACTION_DURATION } },
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
              apm_ml_version: 2,
            },
          },
        },
      ],
    });
  });
}

async function getUniqueMlJobEnvs(
  setup: Setup,
  environments: string[],
  logger: Logger
) {
  // skip creation of duplicate ML jobs
  const jobs = await getAnomalyDetectionJobs(setup, logger);
  const existingMlJobEnvs = jobs.map(({ environment }) => environment);
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
