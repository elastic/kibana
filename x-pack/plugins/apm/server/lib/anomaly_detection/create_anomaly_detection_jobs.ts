/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import uuid from 'uuid/v4';
import { PromiseReturnType } from '../../../../observability/typings/common';
import { Setup } from '../helpers/setup_request';
import { JobResponse } from '../../../../ml/common/types/modules';
import {
  SERVICE_ENVIRONMENT,
  TRANSACTION_DURATION,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';

const ML_MODULE_ID_APM_TRANSACTION = 'apm_transaction';
export const ML_GROUP_NAME_APM = 'apm';

export type CreateAnomalyDetectionJobsAPIResponse = PromiseReturnType<
  typeof createAnomalyDetectionJobs
>;
export async function createAnomalyDetectionJobs(
  setup: Setup,
  environments: string[],
  logger: Logger
) {
  const { ml, config } = setup;
  if (!ml) {
    return [];
  }
  const mlCapabilities = await ml.mlSystem.mlCapabilities();
  if (
    !(
      mlCapabilities.mlFeatureEnabledInSpace &&
      mlCapabilities.isPlatinumOrTrialLicense
    )
  ) {
    logger.warn(
      'Anomaly detection integration is not available for this user.'
    );
    return [];
  }
  logger.info(
    `Creating ML anomaly detection jobs for environments: [${environments}].`
  );

  const indexPatternName = config['apm_oss.transactionIndices']; // TODO [ML] - Do we want to use the config index name?
  const dataRecognizerConfigResponses = await Promise.all(
    environments.map((environment) =>
      configureAnomalyDetectionJob({ ml, environment, indexPatternName })
    )
  );
  const newJobResponses = dataRecognizerConfigResponses.reduce(
    (acc, response) => {
      return [...acc, ...response.jobs];
    },
    [] as JobResponse[]
  );

  const failedJobs = newJobResponses.filter(({ success }) => !success);

  if (failedJobs.length > 0) {
    const allJobsFailed = failedJobs.length === newJobResponses.length;

    logger.error('Failed to create anomaly detection ML jobs.');
    failedJobs.forEach(({ error }) => logger.error(JSON.stringify(error)));

    if (allJobsFailed) {
      throw new Error('Failed to setup anomaly detection ML jobs.');
    }
    const failedJobIds = failedJobs.map(({ id }) => id);
    throw new Error(
      `Some anomaly detection ML jobs failed to setup: [${failedJobIds.join(
        ', '
      )}]`
    );
  }

  return newJobResponses;
}

async function configureAnomalyDetectionJob({
  ml,
  environment,
  indexPatternName = 'apm-*-transaction-*',
}: {
  ml: Required<Setup>['ml'];
  environment: string;
  indexPatternName?: string | undefined;
}) {
  const convertedEnvironmentName = convertToMLIdentifier(environment);
  const randomToken = uuid().substr(-4);

  return ml.modules.setup({
    moduleId: ML_MODULE_ID_APM_TRANSACTION,
    prefix: `${ML_GROUP_NAME_APM}-${convertedEnvironmentName}-${randomToken}-`,
    groups: [ML_GROUP_NAME_APM, convertedEnvironmentName],
    indexPatternName,
    query: {
      bool: {
        filter: [
          { term: { [PROCESSOR_EVENT]: 'transaction' } },
          { exists: { field: TRANSACTION_DURATION } },
          { term: { [SERVICE_ENVIRONMENT]: environment } },
        ],
      },
    },
    startDatafeed: true,
    jobOverrides: [
      {
        custom_settings: {
          job_tags: {
            [SERVICE_ENVIRONMENT]: environment,
          },
        },
      },
    ],
  });
}

export function convertToMLIdentifier(value: string) {
  return value.replace(/\s+/g, '_').toLowerCase();
}
