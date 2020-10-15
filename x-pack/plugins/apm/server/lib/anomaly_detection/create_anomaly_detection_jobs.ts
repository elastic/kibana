/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import uuid from 'uuid/v4';
import { snakeCase } from 'lodash';
import Boom from 'boom';
import { ProcessorEvent } from '../../../common/processor_event';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { PromiseReturnType } from '../../../../observability/typings/common';
import { Setup } from '../helpers/setup_request';
import {
  TRANSACTION_DURATION,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { APM_ML_JOB_GROUP, ML_MODULE_ID_APM_TRANSACTION } from './constants';
import { getEnvironmentUiFilterES } from '../helpers/convert_ui_filters/get_environment_ui_filter_es';

export type CreateAnomalyDetectionJobsAPIResponse = PromiseReturnType<
  typeof createAnomalyDetectionJobs
>;
export async function createAnomalyDetectionJobs(
  setup: Setup,
  environments: string[],
  logger: Logger
) {
  const { ml, indices } = setup;

  if (!ml) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  const mlCapabilities = await ml.mlSystem.mlCapabilities();
  if (!mlCapabilities.mlFeatureEnabledInSpace) {
    throw Boom.forbidden(ML_ERRORS.ML_NOT_AVAILABLE_IN_SPACE);
  }

  logger.info(
    `Creating ML anomaly detection jobs for environments: [${environments}].`
  );

  const indexPatternName = indices['apm_oss.transactionIndices'];
  const responses = await Promise.all(
    environments.map((environment) =>
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
  const randomToken = uuid().substr(-4);

  return ml.modules.setup({
    moduleId: ML_MODULE_ID_APM_TRANSACTION,
    prefix: `${APM_ML_JOB_GROUP}-${snakeCase(environment)}-${randomToken}-`,
    groups: [APM_ML_JOB_GROUP],
    indexPatternName,
    query: {
      bool: {
        filter: [
          { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
          { exists: { field: TRANSACTION_DURATION } },
          ...getEnvironmentUiFilterES(environment),
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
}
