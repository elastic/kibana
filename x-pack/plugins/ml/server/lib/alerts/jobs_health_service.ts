/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { Logger } from 'kibana/server';
import { MlJobState } from '@elastic/elasticsearch/api/types';
import { MlClient } from '../ml_client';
import {
  AnomalyDetectionJobsHealthRuleParams,
  JobSelection,
} from '../../routes/schemas/alerting_schema';
import { datafeedsProvider, DatafeedsService } from '../../models/job_service/datafeeds';
import { ALL_JOBS_SELECTION, HEALTH_CHECK_NAMES } from '../../../common/constants/alerts';
import { DatafeedStats } from '../../../common/types/anomaly_detection_jobs';
import { GetGuards } from '../../shared_services/shared_services';
import { AnomalyDetectionJobsHealthAlertContext } from './register_jobs_monitoring_rule_type';
import { getResultJobsHealthRuleConfig } from '../../../common/util/alerts';

interface TestResult {
  name: string;
  context: AnomalyDetectionJobsHealthAlertContext;
}

type TestsResults = TestResult[];

type NotStartedDatafeedResponse = Array<DatafeedStats & { job_id: string; job_state: MlJobState }>;

export function jobsHealthServiceProvider(
  mlClient: MlClient,
  datafeedsService: DatafeedsService,
  logger: Logger
) {
  /**
   * Extracts result list of job ids based on included and excluded selection of jobs and groups.
   * @param includeJobs
   * @param excludeJobs
   */
  const getResultJobIds = async (includeJobs: JobSelection, excludeJobs?: JobSelection | null) => {
    const jobAndGroupIds = [...(includeJobs.jobIds ?? []), ...(includeJobs.groupIds ?? [])];

    const includeAllJobs = jobAndGroupIds.some((id) => id === ALL_JOBS_SELECTION);

    // Extract jobs from group ids and make sure provided jobs assigned to a current space
    const jobsResponse = (
      await mlClient.getJobs({
        ...(includeAllJobs ? {} : { job_id: jobAndGroupIds }),
      })
    ).body.jobs;

    let resultJobIds = jobsResponse.map((v) => v.job_id);

    if (excludeJobs && (!!excludeJobs.jobIds.length || !!excludeJobs?.groupIds.length)) {
      const excludedJobAndGroupIds = [
        ...(excludeJobs?.jobIds ?? []),
        ...(excludeJobs?.groupIds ?? []),
      ];
      const excludedJobsResponse = (
        await mlClient.getJobs({
          job_id: excludedJobAndGroupIds,
        })
      ).body.jobs;

      const excludedJobsIds: Set<string> = new Set(excludedJobsResponse.map((v) => v.job_id));

      resultJobIds = resultJobIds.filter((v) => !excludedJobsIds.has(v));
    }

    return resultJobIds;
  };

  return {
    /**
     * Gets not started datafeeds for opened jobs.
     * @param jobIds
     */
    async getNotStartedDatafeeds(jobIds: string[]): Promise<NotStartedDatafeedResponse | void> {
      const datafeeds = await datafeedsService.getDatafeedByJobId(jobIds);

      if (datafeeds) {
        const {
          body: { jobs: jobsStats },
        } = await mlClient.getJobStats({ job_id: jobIds.join(',') });

        const {
          body: { datafeeds: datafeedsStats },
        } = await mlClient.getDatafeedStats({
          datafeed_id: datafeeds.map((d) => d.datafeed_id).join(','),
        });

        // match datafeed stats with the job ids
        return (datafeedsStats as DatafeedStats[])
          .map((datafeedStats) => {
            const jobId = datafeedStats.timing_stats.job_id;
            const jobState =
              jobsStats.find((jobStats) => jobStats.job_id === jobId)?.state ?? 'failed';
            return {
              ...datafeedStats,
              job_id: jobId,
              job_state: jobState,
            };
          })
          .filter((datafeedStat) => {
            // Find opened jobs with not started datafeeds
            return datafeedStat.job_state === 'opened' && datafeedStat.state !== 'started';
          });
      }
    },
    /**
     * Retrieves report grouped by test.
     */
    async getTestsResults(
      ruleInstanceName: string,
      { testsConfig, includeJobs, excludeJobs }: AnomalyDetectionJobsHealthRuleParams
    ): Promise<TestsResults> {
      const config = getResultJobsHealthRuleConfig(testsConfig);

      const results: TestsResults = [];

      const jobIds = await getResultJobIds(includeJobs, excludeJobs);

      if (jobIds.length === 0) {
        logger.warn(`Rule "${ruleInstanceName}" does not have associated jobs.`);
        return results;
      }

      logger.debug(`Performing health checks for job IDs: ${jobIds.join(', ')}`);

      if (config.datafeed.enabled) {
        const response = await this.getNotStartedDatafeeds(jobIds);
        if (response && response.length > 0) {
          results.push({
            name: HEALTH_CHECK_NAMES.datafeed,
            context: {
              jobIds: [...new Set(response.map((v) => v.job_id))],
              message: i18n.translate(
                'xpack.ml.alertTypes.jobsHealthAlertingRule.datafeedStateMessage',
                {
                  defaultMessage: 'Datafeed is not started for the following jobs:',
                }
              ),
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
