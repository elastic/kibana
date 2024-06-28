/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { snakeCase } from 'lodash';
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { waitForIndexStatus } from '@kbn/core-saved-objects-migration-server-internal';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { METRICSET_NAME, PROCESSOR_EVENT } from '../../../common/es_fields/apm';
import { Environment } from '../../../common/environment_rt';
import { environmentQuery } from '../../../common/utils/environment_query';
import { withApmSpan } from '../../utils/with_apm_span';
import { MlClient } from '../helpers/get_ml_client';
import { APM_ML_JOB_GROUP, ML_MODULE_ID_APM_TRANSACTION } from './constants';
import { getAnomalyDetectionJobs } from './get_anomaly_detection_jobs';

const DEFAULT_TIMEOUT = '60s';

export async function createAnomalyDetectionJobs({
  mlClient,
  esClient,
  indices,
  environments,
  logger,
  esCapabilities,
}: {
  mlClient?: MlClient;
  esClient: ElasticsearchClient;
  indices: APMIndices;
  environments: Environment[];
  logger: Logger;
  esCapabilities: ElasticsearchCapabilities;
}) {
  if (!mlClient) {
    throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
  }

  const uniqueMlJobEnvs = await getUniqueMlJobEnvs(mlClient, environments, logger);
  if (uniqueMlJobEnvs.length === 0) {
    return [];
  }

  return withApmSpan('create_anomaly_detection_jobs', async () => {
    logger.info(`Creating ML anomaly detection jobs for environments: [${uniqueMlJobEnvs}].`);

    const apmMetricIndex = indices.metric;
    const responses = [];
    const failedJobs = [];
    // Avoid the creation of multiple ml jobs in parallel
    // https://github.com/elastic/elasticsearch/issues/36271
    for (const environment of uniqueMlJobEnvs) {
      try {
        responses.push(
          await createAnomalyDetectionJob({
            mlClient,
            esClient,
            environment,
            apmMetricIndex,
            esCapabilities,
          })
        );
      } catch (e) {
        if (!e.id || !e.error) {
          throw e;
        }
        failedJobs.push({ id: e.id, error: e.error });
      }
    }

    const jobResponses = responses.flatMap((response) => response.jobs);

    if (failedJobs.length > 0) {
      throw new Error(`An error occurred while creating ML jobs: ${JSON.stringify(failedJobs)}`);
    }

    return jobResponses;
  });
}

async function createAnomalyDetectionJob({
  mlClient,
  esClient,
  environment,
  apmMetricIndex,
  esCapabilities,
}: {
  mlClient: Required<MlClient>;
  esClient: ElasticsearchClient;
  environment: string;
  apmMetricIndex: string;
  esCapabilities: ElasticsearchCapabilities;
}) {
  const { serverless } = esCapabilities;

  return withApmSpan('create_anomaly_detection_job', async () => {
    const randomToken = uuidv4().substr(-4);

    const anomalyDetectionJob = mlClient.modules.setup({
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

    // Waiting for the index is not enabled in serverless, this could potentially cause
    // problems when creating jobs in parallels
    if (!serverless) {
      await waitForIndexStatus({
        client: esClient,
        index: '.ml-*',
        timeout: DEFAULT_TIMEOUT,
        status: 'yellow',
      })();
    }

    return anomalyDetectionJob;
  });
}

async function getUniqueMlJobEnvs(mlClient: MlClient, environments: Environment[], logger: Logger) {
  // skip creation of duplicate ML jobs
  const jobs = await getAnomalyDetectionJobs(mlClient);
  const existingMlJobEnvs = jobs
    .filter((job) => job.version === 3)
    .map(({ environment }) => environment);

  const requestedExistingMlJobEnvs = environments.filter((env) => existingMlJobEnvs.includes(env));

  if (requestedExistingMlJobEnvs.length) {
    logger.warn(
      `Skipping creation of existing ML jobs for environments: [${requestedExistingMlJobEnvs}]}`
    );
  }

  return environments.filter((env) => !existingMlJobEnvs.includes(env));
}
