/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobsHealthService, jobsHealthServiceProvider } from './jobs_health_service';
import type { DatafeedsService } from '../../models/job_service/datafeeds';
import type { Logger } from 'kibana/server';
import { MlClient } from '../ml_client';
import { MlJob, MlJobStats } from '@elastic/elasticsearch/api/types';
import { AnnotationService } from '../../models/annotation_service/annotation';

const MOCK_DATE_NOW = 1487076708000;

describe('JobsHealthService', () => {
  const mlClient = ({
    getJobs: jest.fn().mockImplementation(({ job_id: jobIds = [] }) => {
      let jobs: MlJob[] = [];

      if (jobIds.some((v: string) => v === 'test_group')) {
        jobs = [
          ({
            job_id: 'test_job_01',
            analysis_config: { bucket_span: '1h' },
          } as unknown) as MlJob,
          ({
            job_id: 'test_job_02',
            analysis_config: { bucket_span: '15m' },
          } as unknown) as MlJob,
          ({
            job_id: 'test_job_03',
            analysis_config: { bucket_span: '8m' },
          } as unknown) as MlJob,
        ];
      }

      if (jobIds[0]?.startsWith('test_job_')) {
        jobs = [
          ({
            job_id: jobIds[0],
            analysis_config: { bucket_span: '1h' },
          } as unknown) as MlJob,
        ];
      }

      return Promise.resolve({
        body: {
          jobs,
        },
      });
    }),
    getJobStats: jest.fn().mockImplementation(({ job_id: jobIdsStr }) => {
      const jobsIds = jobIdsStr.split(',');
      return Promise.resolve({
        body: {
          jobs: jobsIds.map((j: string) => {
            return {
              job_id: j,
              state: j === 'test_job_02' || 'test_job_01' ? 'opened' : 'closed',
              model_size_stats: {
                memory_status: j === 'test_job_01' ? 'hard_limit' : 'ok',
                log_time: 1626935914540,
              },
            };
          }) as MlJobStats,
        },
      });
    }),
    getDatafeedStats: jest.fn().mockImplementation(({ datafeed_id: datafeedIdsStr }) => {
      const datafeedIds = datafeedIdsStr.split(',');
      return Promise.resolve({
        body: {
          datafeeds: datafeedIds.map((d: string) => {
            return {
              datafeed_id: d,
              state: d === 'test_datafeed_02' ? 'stopped' : 'started',
              timing_stats: {
                job_id: d.replace('datafeed', 'job'),
              },
            };
          }) as MlJobStats,
        },
      });
    }),
  } as unknown) as jest.Mocked<MlClient>;

  const datafeedsService = ({
    getDatafeedByJobId: jest.fn().mockImplementation((jobIds: string[]) => {
      return Promise.resolve(
        jobIds.map((j) => {
          return {
            job_id: j,
            datafeed_id: j.replace('job', 'datafeed'),
            query_delay: '3m',
          };
        })
      );
    }),
  } as unknown) as jest.Mocked<DatafeedsService>;

  const annotationService = ({
    getDelayedDataAnnotations: jest.fn().mockImplementation(({ jobIds }: { jobIds: string[] }) => {
      return Promise.resolve(
        jobIds.map((jobId) => {
          return {
            job_id: jobId,
            annotation: `Datafeed has missed ${
              jobId === 'test_job_01' ? 11 : 8
            } documents due to ingest latency, latest bucket with missing data is [2021-07-30T13:50:00.000Z]. Consider increasing query_delay`,
            modified_time: 1627660295141,
            end_timestamp: 1627653300000,
          };
        })
      );
    }),
  } as unknown) as jest.Mocked<AnnotationService>;

  const logger = ({
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown) as jest.Mocked<Logger>;

  const jobHealthService: JobsHealthService = jobsHealthServiceProvider(
    mlClient,
    datafeedsService,
    annotationService,
    logger
  );

  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => MOCK_DATE_NOW);
  });

  afterEach(() => {
    jest.clearAllMocks();
    dateNowSpy.mockRestore();
  });

  test('returns empty results when no jobs provided', async () => {
    // act
    const executionResult = await jobHealthService.getTestsResults('testRule', {
      testsConfig: null,
      includeJobs: {
        jobIds: ['*'],
        groupIds: [],
      },
      excludeJobs: null,
    });
    expect(logger.warn).toHaveBeenCalledWith('Rule "testRule" does not have associated jobs.');
    expect(datafeedsService.getDatafeedByJobId).not.toHaveBeenCalled();
    expect(executionResult).toEqual([]);
  });

  test('returns empty results and does not perform datafeed check when test is disabled', async () => {
    const executionResult = await jobHealthService.getTestsResults('testRule', {
      testsConfig: {
        datafeed: {
          enabled: false,
        },
        behindRealtime: null,
        delayedData: {
          enabled: false,
          docsCount: null,
          timeInterval: null,
        },
        errorMessages: null,
        mml: {
          enabled: false,
        },
      },
      includeJobs: {
        jobIds: ['test_job_01'],
        groupIds: [],
      },
      excludeJobs: null,
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(`Performing health checks for job IDs: test_job_01`);
    expect(datafeedsService.getDatafeedByJobId).not.toHaveBeenCalled();
    expect(executionResult).toEqual([]);
  });

  test('takes into account delayed data params', async () => {
    const executionResult = await jobHealthService.getTestsResults('testRule_04', {
      testsConfig: {
        delayedData: {
          enabled: true,
          docsCount: 10,
          timeInterval: '4h',
        },
        behindRealtime: { enabled: false, timeInterval: null },
        mml: { enabled: false },
        datafeed: { enabled: false },
        errorMessages: { enabled: false },
      },
      includeJobs: {
        jobIds: [],
        groupIds: ['test_group'],
      },
      excludeJobs: {
        jobIds: ['test_job_03'],
        groupIds: [],
      },
    });

    expect(annotationService.getDelayedDataAnnotations).toHaveBeenCalledWith({
      jobIds: ['test_job_01', 'test_job_02'],
      // 1487076708000 - 4h
      earliestMs: 1487062308000,
    });

    expect(executionResult).toEqual([
      {
        name: 'Data delay has occurred',
        context: {
          results: [
            {
              job_id: 'test_job_01',
              annotation:
                'Datafeed has missed 11 documents due to ingest latency, latest bucket with missing data is [2021-07-30T13:50:00.000Z]. Consider increasing query_delay',
              end_timestamp: 1627653300000,
              missed_docs_count: 11,
            },
          ],
          message: '1 job is suffering from delayed data.',
        },
      },
    ]);
  });

  test('returns results based on provided selection', async () => {
    const executionResult = await jobHealthService.getTestsResults('testRule_03', {
      testsConfig: null,
      includeJobs: {
        jobIds: [],
        groupIds: ['test_group'],
      },
      excludeJobs: {
        jobIds: ['test_job_03'],
        groupIds: [],
      },
    });
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      `Performing health checks for job IDs: test_job_01, test_job_02`
    );
    expect(datafeedsService.getDatafeedByJobId).toHaveBeenCalledWith([
      'test_job_01',
      'test_job_02',
    ]);
    expect(datafeedsService.getDatafeedByJobId).toHaveBeenCalledTimes(1);
    expect(mlClient.getJobStats).toHaveBeenCalledWith({ job_id: 'test_job_01,test_job_02' });
    expect(mlClient.getDatafeedStats).toHaveBeenCalledWith({
      datafeed_id: 'test_datafeed_01,test_datafeed_02',
    });
    expect(mlClient.getJobStats).toHaveBeenCalledTimes(1);
    expect(annotationService.getDelayedDataAnnotations).toHaveBeenCalledWith({
      jobIds: ['test_job_01', 'test_job_02'],
      earliestMs: 1487069268000,
    });

    expect(executionResult).toEqual([
      {
        name: 'Datafeed is not started',
        context: {
          results: [
            {
              job_id: 'test_job_02',
              job_state: 'opened',
              datafeed_id: 'test_datafeed_02',
              datafeed_state: 'stopped',
            },
          ],
          message: 'Datafeed is not started for the following jobs:',
        },
      },
      {
        name: 'Model memory limit reached',
        context: {
          results: [
            {
              job_id: 'test_job_01',
              log_time: 1626935914540,
              memory_status: 'hard_limit',
            },
          ],
          message:
            '1 job reached the hard model memory limit. Assign the job more memory and restore from a snapshot from prior to reaching the hard limit.',
        },
      },
      {
        name: 'Data delay has occurred',
        context: {
          results: [
            {
              job_id: 'test_job_01',
              annotation:
                'Datafeed has missed 11 documents due to ingest latency, latest bucket with missing data is [2021-07-30T13:50:00.000Z]. Consider increasing query_delay',
              end_timestamp: 1627653300000,
              missed_docs_count: 11,
            },
            {
              job_id: 'test_job_02',
              annotation:
                'Datafeed has missed 8 documents due to ingest latency, latest bucket with missing data is [2021-07-30T13:50:00.000Z]. Consider increasing query_delay',
              end_timestamp: 1627653300000,
              missed_docs_count: 8,
            },
          ],
          message: '2 jobs are suffering from delayed data.',
        },
      },
    ]);
  });
});
