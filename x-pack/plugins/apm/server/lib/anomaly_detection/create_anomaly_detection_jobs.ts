/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
// import uuid from 'uuid/v4';
// import { Job as AnomalyDetectionJob } from '../../../../ml/server';
import { PromiseReturnType } from '../../../../observability/typings/common';
import { Setup } from '../helpers/setup_request';

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
    logger.warn('Anomaly detection integration is not availble for this user.');
    return [];
  }
  logger.info(
    `Creating ML anomaly detection jobs for environments: [${environments}]...`
  );

  const result = await Promise.all(
    environments.map((environment) => {
      return configureAnomalyDetectionJob({ ml, environment });
    })
  );
  return result;
}

async function configureAnomalyDetectionJob({
  ml,
  environment,
}: {
  ml: Required<Setup>['ml'];
  environment: string;
}) {
  const convertedEnvironment = environment; // TODO convert to ML id compatible format
  const randomToken = '1234'; // TODO use generated UUID
  const moduleId = 'apm_transaction';
  const prefix = `apm-${convertedEnvironment}-${randomToken}-`;
  const groups = ['apm', convertedEnvironment];
  const indexPatternName = 'apm-*-transaction-*';
  const query = {
    bool: {
      filter: [
        { term: { 'processor.event': 'transaction' } },
        { exists: { field: 'transaction.duration.us' } },
        { term: { 'service.environment': environment } },
      ],
    },
  };
  const useDedicatedIndex = false;
  const startDatafeed = true;
  const start = undefined;
  const end = undefined;
  const jobOverrides = [
    {
      custom_settings: {
        job_tags: {
          'service.environment': environment,
        },
      },
    },
  ];
  const datafeedOverrides = undefined;

  return ml.modules.setupModuleItems(
    moduleId,
    prefix,
    groups,
    indexPatternName,
    query,
    useDedicatedIndex,
    startDatafeed,
    start,
    end,
    jobOverrides, // Typescript Error: '{ job_tags: { 'service.environment': string; }; }' has no properties in common with type 'CustomSettings'.
    datafeedOverrides
  );
}
