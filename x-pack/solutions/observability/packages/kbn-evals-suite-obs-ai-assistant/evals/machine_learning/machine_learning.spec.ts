/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlGetJobsResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  cleanupMachineLearningJobs,
  createApmJobWithNormalData,
  createAnomalyDetectionJobWithNoData,
} from '../../src/data_generators/machine_learning_jobs';
import { createSampleDataMLJobs } from '../../src/data_generators/load_sample_data';
import { evaluate } from '../../src/evaluate';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/machine_learning/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

evaluate.describe('Machine learning (ML)', { tag: '@svlOblt' }, () => {
  const TEST_INDEX = 'my-index-000001';
  const TEST_JOB_ID = 'test-job-anomaly-detection';
  const TEST_DATAFEED_ID = `datafeed-${TEST_JOB_ID}`;
  const SERVICE_TEST_NAME = 'web-api';
  const TEST_JOB_ID_2 = 'response_time_anomaly_detection';
  const TEST_DATAFEED_ID_2 = `datafeed-${TEST_JOB_ID_2}`;
  let jobs: MlGetJobsResponse = { count: 0, jobs: [] };
  let jobIds: string[] = [];
  evaluate.beforeAll(async ({ apmSynthtraceEsClient, kbnClient, esClient, log }) => {
    await cleanupMachineLearningJobs({ esClient, log });
    await esClient.indices.delete({ index: TEST_INDEX, ignore_unavailable: true });
    await apmSynthtraceEsClient.clean();
    await createSampleDataMLJobs({
      log,
      kbnClient,
      sampleDataId: 'logs',
    });

    await createApmJobWithNormalData(
      esClient,
      apmSynthtraceEsClient,
      SERVICE_TEST_NAME,
      TEST_JOB_ID,
      TEST_DATAFEED_ID,
      log
    );

    await createAnomalyDetectionJobWithNoData(
      esClient,
      TEST_INDEX,
      TEST_JOB_ID_2,
      TEST_DATAFEED_ID_2,
      log
    );

    await esClient.ml.closeJob({ job_id: TEST_JOB_ID_2, force: true });

    jobs = await esClient.ml.getJobs();
    jobIds = jobs.jobs.map((job) => job.job_id);
  });

  evaluate.afterAll(async ({ apmSynthtraceEsClient, kbnClient, esClient, log }) => {
    await cleanupMachineLearningJobs({ esClient, log });
    await esClient.indices.delete({ index: TEST_INDEX, ignore_unavailable: true });
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
          ],
        },
      });
    });

    evaluate('returns the ML jobs stats details', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: jobs stats',
          description: 'Returns the machine learning jobs statistics details.',
          examples: [
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
          ],
        },
      });
    });

    evaluate('returns open ML jobs', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: open jobs',
          description: 'Returns the open machine learning jobs.',
          examples: [
            {
              input: {
                question: 'Which machine learning jobs are open?',
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
                  'Returns the open machine learning jobs based on the response from the Elasticsearch function, its not empty',
                  `Includes ${TEST_JOB_ID} in the list of open machine learning jobs`,
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });

    evaluate('returns closed ML jobs', async ({ evaluateDataset }) => {
      const closedJobIds = jobIds.filter((jobId) => jobId !== TEST_JOB_ID);
      await evaluateDataset({
        dataset: {
          name: 'ml: closed jobs',
          description: 'Returns the closed machine learning jobs.',
          examples: [
            {
              input: {
                question: 'Which machine learning jobs are closed?',
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors',
                  'Returns the closed ML jobs based on the response from the Elasticsearch function, its not empty',
                  `Includes ${closedJobIds.join(', ')} in the list of closed machine learning jobs`,
                  `Does not include ${TEST_JOB_ID} in the list of closed ML jobs`,
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });

    evaluate('returns failed or stopped ML jobs', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: failed or stopped jobs',
          description: 'Returns the failed or stopped machine learning jobs.',
          examples: [
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
          ],
        },
      });
    });

    evaluate('returns specific ML job status', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: specific job status',
          description: 'Returns the status of a specific machine learning job.',
          examples: [
            {
              input: {
                question: `What is the status of machine learning job with the ID ${TEST_JOB_ID}?`,
              },
              output: {
                criteria: [
                  `Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors/${TEST_JOB_ID}`,
                  `Returns the details of ML job id ${TEST_JOB_ID} based on the response from the Elasticsearch function`,
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });

    evaluate('lists open ML jobs for specific apps', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: open jobs for specific apps',
          description: 'Returns the open machine learning jobs for specific applications.',
          examples: [
            {
              input: {
                question: `List all open machine learning jobs for app ${SERVICE_TEST_NAME}`,
              },
              output: {
                criteria: [
                  'Calls the Elasticsearch function with GET method and path that contains: ml/anomaly_detectors or uses the query function',
                  'Filters jobs by the service name, its not empty',
                  `Includes ${TEST_JOB_ID} in the list of open machine learning jobs`,
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });

    evaluate(
      `reports whether ML job ids ${TEST_JOB_ID} and ${TEST_JOB_ID_2} is running and the last time evaluate ran`,
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'ml: job running status and last run time',
            description: `Reports whether machine learning job ids ${TEST_JOB_ID} and ${TEST_JOB_ID_2} is running and the last time evaluate ran.`,
            examples: [
              {
                input: {
                  question: `Are the machine learning jobs ${TEST_JOB_ID} and ${TEST_JOB_ID_2} running now? When was the last time evaluate ran?`,
                },
                output: {
                  criteria: [
                    'Checks ml/anomaly_detectors/${TEST_JOB_ID}/_stats and ml/anomaly_detectors/${TEST_JOB_ID_2}/_stats for state=open/closed',
                    'Returns the last time the job ran by reading data_counts.latest_record_timestamp or timing stats for last run time',
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

  evaluate.describe('Anomaly detection', () => {
    evaluate(
      'returns anomalies and explain what the anomaly is about?',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'ml: anomalies',
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
            ],
          },
        });
      }
    );

    evaluate(
      'returns anomalies in indices and explain what the anomaly is about?',
      async ({ evaluateDataset }) => {
        const listJobIds = jobIds.join(', ');
        await evaluateDataset({
          dataset: {
            name: 'ml: anomalies for specific indices',
            description:
              'Returns anomalies detected by machine learning jobs for specific indices.',
            examples: [
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
            ],
          },
        });
      }
    );

    evaluate(
      'list ML job anomalies with score > 50 and links them to jobs',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'ml: anomalies with score > 50',
            description:
              'Returns anomalies detected by machine learning jobs with anomaly score > 50.',
            examples: [
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
            ],
          },
        });
      }
    );

    evaluate(
      'explains anomalies for a ML job id with cause analysis',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'ml: explain anomalies for a job with cause analysis',
            description:
              'Explains anomalies detected by a machine learning job with cause analysis.',
            examples: [
              {
                input: {
                  question: `Explain ${TEST_JOB_ID} anomaly alerts and indicate probable cause.`,
                },
                output: {
                  criteria: [
                    `Fetches ml/anomaly_detectors/${TEST_JOB_ID} or uses the query function`,
                    'Provides summary and probable causes based on influencers/fields',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      }
    );

    evaluate(
      'explains anomalies for a specific application with probable cause',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'ml: explain anomalies for a specific application with probable cause',
            description:
              'Explains anomalies detected for a specific application with probable cause.',
            examples: [
              {
                input: {
                  question: `Explain ${SERVICE_TEST_NAME} anomaly alerts and indicate the probable cause.`,
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
            ],
          },
        });
      }
    );

    evaluate(
      'performs root cause analysis on the top influencer for anomalies',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'ml: root cause analysis on top influencer for anomalies',
            description:
              'Performs root cause analysis on the top influencer for anomalies detected by machine learning jobs.',
            examples: [
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
    evaluate('summarizes ML jobs alerts', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: jobs alerts summary',
          description: 'Summarizes machine learning jobs alerts.',
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
          ],
        },
      });
    });

    evaluate('lists ML jobs alerts in the past hour with severity', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ml: jobs alerts in the past hour',
          description: 'Lists machine learning jobs alerts in the past hour with severity.',
          examples: [
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
