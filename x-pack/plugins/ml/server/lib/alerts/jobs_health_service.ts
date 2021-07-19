/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { Logger } from 'kibana/server';
import { MlClient } from '../ml_client';
import {
  AnomalyDetectionJobsHealthRuleParams,
  JobSelection,
} from '../../routes/schemas/alerting_schema';
import { datafeedsProvider, DatafeedsService } from '../../models/job_service/datafeeds';
import { ALL_JOBS_SELECTION } from '../../../common/constants/alerts';
import { MlJobsResponse } from '../../../common/types/job_service';
import { DatafeedStats } from '../../../common/types/anomaly_detection_jobs';
import { GetGuards } from '../../shared_services/shared_services';
import { AnomalyDetectionJobsHealthAlertContext } from './register_jobs_monitoring_rule_type';

interface TestResult {
  name: string;
  context: AnomalyDetectionJobsHealthAlertContext;
}

type TestsResults = TestResult[];

type NotStartedDatafeedResponse = Array<DatafeedStats & { job_id: string }>;

export function jobsHealthServiceProvider(
  mlClient: MlClient,
  datafeedsService: DatafeedsService,
  logger: Logger
) {
  /**
   * Extract result list of job ids based on included and excluded selection of jobs and groups.
   * @param includeJobs
   * @param excludeJobs
   */
  const getResultJobIds = async (includeJobs: JobSelection, excludeJobs?: JobSelection | null) => {
    const jobAndGroupIds = [...(includeJobs.jobIds ?? []), ...(includeJobs.groupIds ?? [])];

    const includeAllJobs = jobAndGroupIds.some((id) => id === ALL_JOBS_SELECTION);

    // Extract jobs from group ids and make sure provided jobs assigned to a current space
    const jobsResponse = (
      await mlClient.getJobs<MlJobsResponse>({
        ...(includeAllJobs ? {} : { job_id: jobAndGroupIds.join(',') }),
      })
    ).body.jobs;

    const resultJobIds = jobsResponse.map((v) => v.job_id);

    if (excludeJobs && (!!excludeJobs.jobIds.length || !!excludeJobs?.groupIds.length)) {
      const excludedJobAndGroupIds = [
        ...(excludeJobs?.jobIds ?? []),
        ...(excludeJobs?.groupIds ?? []),
      ];
      const excludedJobsResponse = (
        await mlClient.getJobs<MlJobsResponse>({
          job_id: excludedJobAndGroupIds.join(','),
        })
      ).body.jobs;

      const excludedJobsIds: Set<string> = new Set(excludedJobsResponse.map((v) => v.job_id));

      resultJobIds.filter((v) => excludedJobsIds.has(v));
    }

    return resultJobIds;
  };

  return {
    /**
     * Gets not started datafeeds for provided jobs selection.
     * @param includeJobs
     * @param excludeJobs
     */
    async getNotStartedDatafeed(
      includeJobs: JobSelection,
      excludeJobs?: JobSelection | null
    ): Promise<NotStartedDatafeedResponse | void> {
      const jobIds = await getResultJobIds(includeJobs, excludeJobs);
      logger.debug(`Performing health checks for job ids: ${jobIds.join(', ')}`);
      const dataFeeds = await datafeedsService.getDatafeedByJobId(jobIds);

      if (dataFeeds) {
        const {
          body: { datafeeds: datafeedsStats },
        } = await mlClient.getDatafeedStats({
          datafeed_id: dataFeeds.map((d) => d.datafeed_id).join(','),
        });

        // match datafeed stats with the job ids

        return (datafeedsStats as DatafeedStats[])
          .filter((datafeedStat) => datafeedStat.state !== 'started')
          .map((datafeedStats) => {
            return {
              ...datafeedStats,
              job_id: dataFeeds.find((d) => d.datafeed_id === datafeedStats.datafeed_id)!.job_id,
            };
          });
      }
    },
    /**
     * Retrieves report grouped by test.
     */
    async getTestsResults({
      testsConfig,
      includeJobs,
      excludeJobs,
    }: AnomalyDetectionJobsHealthRuleParams): Promise<TestsResults> {
      const config = {
        dataFeed: {
          enabled: testsConfig?.dataFeed?.enabled ?? true,
        },
        mml: {
          enabled: testsConfig?.mml?.enabled ?? true,
        },
        delayedData: {
          enabled: testsConfig?.delayedData?.enabled ?? true,
        },
        behindRealtime: {
          enabled: testsConfig?.behindRealtime?.enabled ?? true,
        },
        errorMessages: {
          enabled: testsConfig?.errorMessages?.enabled ?? true,
        },
      };

      const results: TestsResults = [];

      if (config.dataFeed.enabled) {
        const response = await this.getNotStartedDatafeed(includeJobs, excludeJobs);
        if (response) {
          results.push({
            name: 'dataFeed',
            context: {
              jobIds: [...new Set(response.map((v) => v.job_id))],
            },
          });
        }
      }

      return results;
    },
  };
}

export type JobsHealthService = ReturnType<typeof jobsHealthServiceProvider>;

export function getJobsHealthServiceProvider(getGuards: GetGuards) {
  return {
    jobsHealthServiceProvider(
      savedObjectsClient: SavedObjectsClientContract,
      request: KibanaRequest,
      logger: Logger
    ) {
      return {
        getTestsResults: async (
          ...args: Parameters<JobsHealthService['getTestsResults']>
        ): ReturnType<JobsHealthService['getTestsResults']> => {
          return await getGuards(request, savedObjectsClient)
            .isFullLicense()
            .hasMlCapabilities(['canGetJobs'])
            .ok(({ mlClient, scopedClient }) =>
              jobsHealthServiceProvider(
                mlClient,
                datafeedsProvider(scopedClient, mlClient),
                logger
              ).getTestsResults(...args)
            );
        },
      };
    },
  };
}

export type JobsHealthServiceProvider = ReturnType<typeof getJobsHealthServiceProvider>;
