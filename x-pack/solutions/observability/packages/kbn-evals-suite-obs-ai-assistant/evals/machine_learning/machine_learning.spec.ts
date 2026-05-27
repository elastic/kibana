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
                  'Returns the list of machine learning jobs based on the response from the Elasticsearch function, Each job includes id, state, description, datafeed indices, influencers, and bucket_span, its not empty',
                  `Includes ${jobIds.join(', ')} in the list of machine learning jobs`,
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
                  `Returns the list of machine learning jobs stats based on the response from the Elasticsearch function, Each job includes processed_record_count, model_size_stats , bucket_count, memory_status, and node information, its not empty`,
                  `Includes ${jobIds.join(', ')} in the list of machine learning jobs stats`,
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
                  'Returns the open machine learning jobs based on the response from the Elasticsearch function, its not empty',
                  `Includes ${APM_ML_JOB_ID} in the list of open machine learning jobs`,
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
                  'Returns the closed ML jobs based on the response from the Elasticsearch function, its not empty',
                  `Includes ${CLOSED_ML_JOB_ID} in the list of closed machine learning jobs`,
                  `Does not include ${APM_ML_JOB_ID} in the list of closed ML jobs`,
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
                  'Filters jobs whose state is failed or stopped/closed, its not empty',
                  'Returns those jobs in the response',
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
                  `Returns the details of ML job id ${APM_ML_JOB_ID} based on the response from the Elasticsearch function`,
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
                  'Filters jobs by the service name, its not empty',
                  `Includes ${APM_ML_JOB_ID} in the list of open machine learning jobs`,
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
                  'Returns the last time the job ran by reading data_counts.latest_record_timestamp or timing stats for last run time',
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
                    'Calls the Elasticsearch function or try to find anomalies by running ES|QL queries',
                    'Returns a list of anomalies found based on the response from the Elasticsearch function, there are more than 0 anomalies',
                    `Includes job with ID ${jobIds.join(', ')} in the anomalies`,
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
                    'Calls the Elasticsearch function or try to find anomalies by running ES|QL queries',
                    `Returns a list of anomalies found based on the response from the Elasticsearch function. Includes job with ID ${listJobIds} in the anomalies, there are more than 0 anomalies`,
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
                    'Calls the Elasticsearch tool or try to find anomalies by running ES|QL queries score > 50',
                    'Returns timestamp, job_id, and score. Links anomalies to their respective ML jobs. There are more than 0 anomalies',
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
                    'Provides summary and probable causes based on influencers/fields',
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
                    'Returns a summary of anomalies with likely causes',
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
                    'Identifies highest influencer_score field/value',
                    'Provides reasoning of probable root cause',
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
                  'Provides a summary of the alerts including job_id, severity, and timestamp',
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
                  'Returns job_id and severity',
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
