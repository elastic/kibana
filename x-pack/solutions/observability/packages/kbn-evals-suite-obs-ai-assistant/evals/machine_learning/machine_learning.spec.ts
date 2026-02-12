/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { MlGetJobsResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  cleanupAnomalyDetectionJobs,
  createAnomalyDetectionJobWithApmData,
  createAnomalyDetectionJobWithNoData,
  APM_ML_JOB_ID,
  APM_SERVICE_NAME,
  CLOSED_ML_JOB_ID,
} from '../../src/data_generators/machine_learning_jobs';
import { createMLJobsWithSampleData } from '../../src/data_generators/load_sample_data';
import { evaluate } from '../../src/evaluate';

evaluate.describe('Machine learning', { tag: tags.serverless.observability.complete }, () => {
  let jobs: MlGetJobsResponse = { count: 0, jobs: [] };
  let jobIds: string[] = [];

  evaluate.beforeAll(async ({ apmSynthtraceEsClient, kbnClient, esClient, log }) => {
    await cleanupAnomalyDetectionJobs({ esClient, log });
    await apmSynthtraceEsClient.clean();
    await createMLJobsWithSampleData({
      log,
      kbnClient,
      sampleDataId: 'logs',
    });

    await createAnomalyDetectionJobWithApmData(esClient, apmSynthtraceEsClient, log);

    await createAnomalyDetectionJobWithNoData(esClient, log);

    await esClient.ml.closeJob({ job_id: CLOSED_ML_JOB_ID, force: true });

    jobs = await esClient.ml.getJobs();
    jobIds = jobs.jobs.map((job) => job.job_id);
  });

  evaluate.afterAll(async ({ apmSynthtraceEsClient, kbnClient, esClient, log }) => {
    await cleanupAnomalyDetectionJobs({ esClient, log });
    await apmSynthtraceEsClient.clean();
  });

  evaluate.describe('Machine learning (ML) jobs', () => {
    evaluate('returns the ML jobs configuration', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: jobs',
          description: 'Returns the machine learning jobs configuration.',
          examples: [
            {
              input: {
                question:
                  'List all machine learning jobs with details such as id, state, and description, datafeed indices, influencers and bucket span',
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
                  'The response should contain a list of machine learning jobs with id, state, description, datafeed indices, influencers, and bucket_span (not empty)',
                  `The response should include ${jobIds.join(', ')} in the list of machine learning jobs`,
                ],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'List all the machine learning job statistics, including processed record counts, model size stats, timing/bucket counts, memory status and current node information.',
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors/_stats',
                  `The response should contain job stats with processed_record_count, model_size_stats, bucket_count, memory_status, and node information (not empty)`,
                  `The response should include ${jobIds.join(', ')} in the list of machine learning jobs stats`,
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: 'Which machine learning jobs are open?',
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
                  'The response should contain a list of open machine learning jobs (not empty)',
                  `The response should include ${APM_ML_JOB_ID} in the list of open machine learning jobs`,
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: 'Which machine learning jobs are closed?',
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
                  'The response should contain a list of closed ML jobs (not empty)',
                  `The response should include ${CLOSED_ML_JOB_ID} in the list of closed machine learning jobs`,
                  `The response should NOT include ${APM_ML_JOB_ID} in the list of closed ML jobs`,
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: 'List all failed or stopped machine learning jobs',
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
                  'Filters jobs whose state is failed or stopped/closed',
                  'The response should contain the failed or stopped/closed jobs (may be empty if none exist)',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: `What is the status of machine learning job with the ID ${APM_ML_JOB_ID}?`,
              },
              output: {
                criteria: [
                  `Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors/${APM_ML_JOB_ID}`,
                  `The response should contain the details of ML job id ${APM_ML_JOB_ID}`,
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: `List all open machine learning jobs for app ${APM_SERVICE_NAME}`,
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors or uses the query function',
                  'Filters jobs by the service name',
                  `The response should include ${APM_ML_JOB_ID} in the list of open machine learning jobs`,
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: `Are the machine learning jobs ${APM_ML_JOB_ID} and ${CLOSED_ML_JOB_ID} running now? When was the last time evaluate ran?`,
              },
              output: {
                criteria: [
                  `Checks ml/anomaly_detectors/${APM_ML_JOB_ID}/_stats and ml/anomaly_detectors/${CLOSED_ML_JOB_ID}/_stats for state=open/closed`,
                  'The response should contain whether each job is running and the last time each job ran (from data_counts.latest_record_timestamp or timing stats)',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });
  });

  evaluate.describe('Anomaly detection', () => {
    const listJobIds = jobIds.join(', ');
    evaluate(
      'returns anomalies and explain what the anomaly is about?',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'ml: anomaly detection',
            description: 'Returns anomalies detected by machine learning jobs.',
            examples: [
              {
                input: {
                  question: `List anomalies and explain what the anomaly is about.`,
                },
                output: {
                  criteria: [
                    'Calls the Elasticsearch function or tries to find anomalies by running ES|QL queries',
                    'The response should contain a list of anomalies found (more than 0)',
                    `The response should include anomalies from job IDs: ${jobIds.join(', ')}`,
                  ],
                },
                metadata: {},
              },
              {
                input: {
                  question: `List anomalies in ${listJobIds} indices and explain what the anomaly is about.`,
                },
                output: {
                  criteria: [
                    'Calls the Elasticsearch function or tries to find anomalies by running ES|QL queries',
                    `The response should contain a list of anomalies (more than 0) from job IDs: ${listJobIds}`,
                  ],
                },
                metadata: {},
              },
              {
                input: {
                  question: 'Any anomalies with anomaly score > 50? List them with job id.',
                },
                output: {
                  criteria: [
                    'Calls the Elasticsearch tool or tries to find anomalies by running ES|QL queries with score > 50',
                    'The response should contain timestamp, job_id, and score for each anomaly, linked to their respective ML jobs (more than 0 anomalies)',
                  ],
                },
                metadata: {},
              },
              {
                input: {
                  question: `Explain ${APM_ML_JOB_ID} anomaly alerts and indicate probable cause.`,
                },
                output: {
                  criteria: [
                    `Fetches ml/anomaly_detectors/${APM_ML_JOB_ID} or uses the query function`,
                    'The response should contain a summary and probable causes based on influencers/fields',
                  ],
                },
                metadata: {},
              },
              {
                input: {
                  question: `Explain ${APM_SERVICE_NAME} anomaly alerts and indicate the probable cause.`,
                },
                output: {
                  criteria: [
                    'Fetches anomalies for the given service/application',
                    'Analyzes influencer fields to infer probable cause',
                    'The response should contain a summary of anomalies with their likely causes',
                  ],
                },
                metadata: {},
              },
              {
                input: {
                  question:
                    'Determine the top influencer field and value responsible for anomalies.',
                },
                output: {
                  criteria: [
                    'Queries ml/anomaly_detectors/_results or uses the query function to fetch recent anomalies',
                    'The response should identify the highest influencer_score field/value',
                    'The response should contain reasoning about the probable root cause',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      }
    );
  });

  evaluate.describe('ML jobs Alerts', () => {
    evaluate('ML jobs alerts', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: jobs alerts summary',
          description: 'machine learning jobs alerts.',
          examples: [
            {
              input: {
                question: 'Summarize machine learning jobs alerts',
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch tool or executes a query on the ML jobs alerts',
                  'The response should contain a summary of alerts including job_id, severity, and timestamp',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'Any alerts raised for the past 1 hour? List them with job id and severity.',
              },
              output: {
                criteria: [
                  'Executes a query on the ML alerts index or uses the Elasticsearch API',
                  'Filters by timestamp within the last 1 hour',
                  'The response should contain job_id and severity for each alert',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });
  });
});
