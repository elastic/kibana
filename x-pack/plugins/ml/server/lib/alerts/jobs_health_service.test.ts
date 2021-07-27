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

describe('JobsHealthService', () => {
  const mlClient = ({
    getJobs: jest.fn().mockImplementation(({ job_id: jobIds = [] }) => {
      let jobs: MlJob[] = [];

      if (jobIds.some((v: string) => v === 'test_group')) {
        jobs = [
          ({
            job_id: 'test_job_01',
          } as unknown) as MlJob,
          ({
            job_id: 'test_job_02',
          } as unknown) as MlJob,
          ({
            job_id: 'test_job_03',
          } as unknown) as MlJob,
        ];
      }

      if (jobIds[0]?.startsWith('test_job_')) {
        jobs = [
          ({
            job_id: jobIds[0],
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
              state: j === 'test_job_02' ? 'opened' : 'closed',
              model_size_stats: {
                memory_status: j === 'test_job_01' ? 'hard_limit' : 'ok',
                log_time: 1626935914540,
                failed_category_count: 0,
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
            datafeed_id: j.replace('job', 'datafeed'),
          };
        })
      );
    }),
  } as unknown) as jest.Mocked<DatafeedsService>;

  const logger = ({
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  } as unknown) as jest.Mocked<Logger>;

  const jobHealthService: JobsHealthService = jobsHealthServiceProvider(
    mlClient,
    datafeedsService,
    logger
  );

  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
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
        delayedData: null,
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
    expect(mlClient.getJobStats).toHaveBeenCalledWith({ job_id: 'test_job_01,test_job_02' });
    expect(mlClient.getDatafeedStats).toHaveBeenCalledWith({
      datafeed_id: 'test_datafeed_01,test_datafeed_02',
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
        name: 'Model memory limit',
        context: {
          results: [
            {
              job_id: 'test_job_01',
              log_time: 1626935914540,
              memory_status: 'hard_limit',
              failed_category_count: 0,
            },
          ],
          message: '1 job reached the hard model memory limit',
        },
      },
    ]);
  });
});
