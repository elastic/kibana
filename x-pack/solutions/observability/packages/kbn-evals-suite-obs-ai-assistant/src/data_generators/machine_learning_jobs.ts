/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { MlGetJobsResponse, MlPutJobRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ScoutLogger } from '@kbn/scout';
import moment from 'moment';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { SynthtraceEsClient } from '@kbn/synthtrace/src/lib/shared/base_client';
import type { ApmFields } from '@kbn/synthtrace-client';

export const ANOMALY_DETECTION_INDEX = 'observability-ml-test-index';

export const APM_ML_JOB_ID = 'apm-service-anomaly-detector';
export const APM_SERVICE_NAME = 'web-api-service';

export const CLOSED_ML_JOB_ID = 'response-time-threshold-detector';

export async function cleanupAnomalyDetectionJobs({
  esClient,
  log,
}: {
  esClient: Client;
  log: ScoutLogger;
}) {
  const jobs: MlGetJobsResponse = await esClient.ml.getJobs();
  try {
    for (const job of jobs.jobs) {
      const datafeedId = job.datafeed_config?.datafeed_id;
      const jobId = job.job_id;
      if (datafeedId) {
        await esClient.ml.stopDatafeed({ datafeed_id: datafeedId, force: true });
        await esClient.ml.deleteDatafeed({ datafeed_id: datafeedId });
      }
      await esClient.ml.closeJob({ job_id: jobId, force: true });
      await esClient.ml.deleteJob({ job_id: jobId });
      await esClient.indices.delete({ index: ANOMALY_DETECTION_INDEX, ignore_unavailable: true });
    }
  } catch (error) {
    log.info('Cleanup warning:', error);
  }
}

async function createAndStartMLJobWithDatafeed(
  esClient: Client,
  mlJobRequest: MlPutJobRequest,
  jobId: string,
  datafeedId: string,
  start: string = 'now-1h'
) {
  await esClient.ml.putJob(mlJobRequest);
  await esClient.ml.openJob({ job_id: jobId });
  await esClient.ml.startDatafeed({
    datafeed_id: datafeedId,
    start,
  });
}

export async function createAnomalyDetectionJobWithApmData(
  esClient: Client,
  apmSynthtraceEsClient: Pick<SynthtraceEsClient<ApmFields>, 'index' | 'clean'>,
  log: ScoutLogger
) {
  log.debug('Generating APM data');
  const datafeedId = `datafeed-${APM_ML_JOB_ID}`;

  const range = timerange(moment().subtract(1, 'days'), moment());

  const myServiceInstance = apm
    .service({ name: APM_SERVICE_NAME, environment: 'production', agentName: 'nodejs' })
    .instance('my-instance');

  // Normal transactions: same duration 5 ms
  const normalDocs = range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      myServiceInstance
        .transaction('GET /api')
        .duration(5) // duration in ms
        .timestamp(timestamp)
    );
  await apmSynthtraceEsClient.index(normalDocs);
  const ML_JOB_CONFIG: MlPutJobRequest = {
    job_id: APM_ML_JOB_ID,
    description: 'Detect anomalies in APM transaction duration',
    analysis_config: {
      bucket_span: '5m',
      detectors: [{ function: 'mean', field_name: 'transaction.duration.us' }],
    },
    data_description: { time_field: '@timestamp' },
    datafeed_config: {
      datafeed_id: datafeedId,
      indices: ['traces-apm*'],
      query: { match: { 'service.name': APM_SERVICE_NAME } },
    },
  };

  await createAndStartMLJobWithDatafeed(
    esClient,
    ML_JOB_CONFIG,
    APM_ML_JOB_ID,
    datafeedId,
    'now-1h'
  );
}

export async function createAnomalyDetectionJobWithNoData(esClient: Client, log: ScoutLogger) {
  const datafeedId = `datafeed-${CLOSED_ML_JOB_ID}`;
  await esClient.indices.create({
    index: ANOMALY_DETECTION_INDEX,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        response_time: { type: 'float' },
        service: { type: 'keyword' },
      },
    },
  });

  const ML_JOB_CONFIG_2 = {
    job_id: CLOSED_ML_JOB_ID,
    description: 'Detect anomalies in average response_time',
    analysis_config: {
      bucket_span: '5m',
      detectors: [
        {
          function: 'mean',
          field_name: 'response_time',
        },
      ],
    },
    data_description: {
      time_field: '@timestamp',
    },
    datafeed_config: {
      datafeed_id: datafeedId,
      indices: [ANOMALY_DETECTION_INDEX],
      query: { match_all: {} },
    },
  };

  await createAndStartMLJobWithDatafeed(
    esClient,
    ML_JOB_CONFIG_2,
    CLOSED_ML_JOB_ID,
    datafeedId,
    'now-1h'
  );
}
