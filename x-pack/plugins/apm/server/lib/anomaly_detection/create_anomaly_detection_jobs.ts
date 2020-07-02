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

export type CreateAnomalyDetectionJobsAPIResponse = PromiseReturnType<
  typeof createAnomalyDetectionJobs
>;
export async function createAnomalyDetectionJobs(
  setup: Setup,
  environments: string[],
  logger: Logger
) {
  const { ml } = setup;
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

  const dataRecognizerConfigResponses = await Promise.all(
    environments.map((environment) =>
      configureAnomalyDetectionJob({ ml, environment })
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
}: {
  ml: Required<Setup>['ml'];
  environment: string;
}) {
  const convertedEnvironmentName = convertToMLIdentifier(environment);
  const randomToken = uuid().substr(-4);

  return ml.modules.setup({
    moduleId: 'apm_transaction',
    prefix: `apm-${convertedEnvironmentName}-${randomToken}-`,
    groups: ['apm', convertedEnvironmentName],
    indexPatternName: 'apm-*-transaction-*',
    query: {
      bool: {
        filter: [
          { term: { 'processor.event': 'transaction' } },
          { exists: { field: 'transaction.duration.us' } },
          { term: { 'service.environment': environment } },
        ],
      },
    },
    startDatafeed: true,
    jobOverrides: [
      {
        custom_settings: {
          job_tags: {
            'service.environment': environment,
          },
        },
      },
    ],
  });
}

export function convertToMLIdentifier(value: string) {
  return value.replace(/\s+/g, '_').toLowerCase();
}
