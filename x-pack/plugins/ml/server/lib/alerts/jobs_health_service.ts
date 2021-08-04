/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectsClientContract } from 'kibana/server';
import { i18n } from '@kbn/i18n';
import { Logger } from 'kibana/server';
import { MlJob, MlJobStats } from '@elastic/elasticsearch/api/types';
import { MlClient } from '../ml_client';
import {
  AnomalyDetectionJobsHealthRuleParams,
  JobSelection,
} from '../../routes/schemas/alerting_schema';
import { datafeedsProvider, DatafeedsService } from '../../models/job_service/datafeeds';
import { ALL_JOBS_SELECTION, HEALTH_CHECK_NAMES } from '../../../common/constants/alerts';
import { DatafeedStats } from '../../../common/types/anomaly_detection_jobs';
import { GetGuards } from '../../shared_services/shared_services';
import {
  AnomalyDetectionJobsHealthAlertContext,
  DelayedDataResponse,
  MmlTestResponse,
  NotStartedDatafeedResponse,
} from './register_jobs_monitoring_rule_type';
import { getResultJobsHealthRuleConfig } from '../../../common/util/alerts';
import { AnnotationService } from '../../models/annotation_service/annotation';
import { annotationServiceProvider } from '../../models/annotation_service';
import { parseInterval } from '../../../common/util/parse_interval';
import { resolveMaxTimeInterval } from '../../../common/util/job_utils';
import { isDefined } from '../../../common/types/guards';

interface TestResult {
  name: string;
  context: AnomalyDetectionJobsHealthAlertContext;
}

type TestsResults = TestResult[];

export function jobsHealthServiceProvider(
  mlClient: MlClient,
  datafeedsService: DatafeedsService,
  annotationService: AnnotationService,
  logger: Logger
) {
  /**
   * Extracts result list of jobs based on included and excluded selection of jobs and groups.
   * @param includeJobs
   * @param excludeJobs
   */
  const getResultJobs = async (
    includeJobs: JobSelection,
    excludeJobs?: JobSelection | null
  ): Promise<MlJob[]> => {
    const jobAndGroupIds = [...(includeJobs.jobIds ?? []), ...(includeJobs.groupIds ?? [])];

    const includeAllJobs = jobAndGroupIds.some((id) => id === ALL_JOBS_SELECTION);

    // Extract jobs from group ids and make sure provided jobs assigned to a current space
    const jobsResponse = (
      await mlClient.getJobs({
        ...(includeAllJobs ? {} : { job_id: jobAndGroupIds }),
      })
    ).body.jobs;

    let resultJobs = jobsResponse;

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

      resultJobs = resultJobs.filter((v) => !excludedJobsIds.has(v.job_id));
    }

    return resultJobs;
  };

  /**
   * Resolves the timestamp for delayed data check.
   *
   * Takes the longest interval between:
   *  - the longest bucket span for provided jobs
   *  - custom interval specified by the user
   *  - the time passed since the previous rule execution
   *
   * @param timeInterval - Custom time interval provided by the user
   * @param bucketSpans - Bucket spans from the jobs configurations.
   * @param previousStartedAt - Date object of the previous rule execution time
   */
  const getDelayedDataLookbackTimestamp = (
    timeInterval: string | null,
    bucketSpans: string[],
    previousStartedAt: Date | null
  ): number => {
    const currentTimestamp = Date.now();

    const maxBucketLengthInSeconds = resolveMaxTimeInterval(bucketSpans) ?? 0;

    if (!maxBucketLengthInSeconds) {
      // technically it is only possible if the ML backend contains invalid bucket spans.
      logger.error('Unable to resolve resulting bucket length.');
    }

    const doubleBucketOffsetTimestamp = currentTimestamp - maxBucketLengthInSeconds * 1000 * 2;

    const customIntervalOffsetTimestamp = timeInterval
      ? currentTimestamp - parseInterval(timeInterval)!.asMilliseconds()
      : null;

    const previousCheckTimestamp = previousStartedAt ? previousStartedAt.getTime() : null;

    return Math.min(
      ...[
        doubleBucketOffsetTimestamp,
        customIntervalOffsetTimestamp,
        previousCheckTimestamp,
      ].filter(isDefined)
    );
  };

  const getJobStats: (jobIds: string[]) => Promise<MlJobStats[]> = (() => {
    const cachedStats = new Map<string, MlJobStats>();

    return async (jobIds: string[]) => {
      if (jobIds.every((j) => cachedStats.has(j))) {
        logger.debug(`Return jobs stats from cache`);
        return Array.from(cachedStats.values());
      }

      const {
        body: { jobs: jobsStats },
      } = await mlClient.getJobStats({ job_id: jobIds.join(',') });

      // update cache
      jobsStats.forEach((v) => {
        cachedStats.set(v.job_id, v);
      });

      return jobsStats;
    };
  })();

  return {
    /**
     * Gets not started datafeeds for opened jobs.
     * @param jobIds
     */
    async getNotStartedDatafeeds(jobIds: string[]): Promise<NotStartedDatafeedResponse[] | void> {
      const datafeeds = await datafeedsService.getDatafeedByJobId(jobIds);

      if (datafeeds) {
        const jobsStats = await getJobStats(jobIds);

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
              datafeed_id: datafeedStats.datafeed_id,
              datafeed_state: datafeedStats.state,
              job_id: jobId,
              job_state: jobState,
            };
          })
          .filter((datafeedStat) => {
            // Find opened jobs with not started datafeeds
            return datafeedStat.job_state === 'opened' && datafeedStat.datafeed_state !== 'started';
          });
      }
    },
    /**
     * Gets jobs that reached soft or hard model memory limits.
     * @param jobIds
     */
    async getMmlReport(jobIds: string[]): Promise<MmlTestResponse[]> {
      const jobsStats = await getJobStats(jobIds);

      return jobsStats
        .filter((j) => j.state === 'opened' && j.model_size_stats.memory_status !== 'ok')
        .map(({ job_id: jobId, model_size_stats: modelSizeStats }) => {
          return {
            job_id: jobId,
            memory_status: modelSizeStats.memory_status,
            log_time: modelSizeStats.log_time,
            model_bytes: modelSizeStats.model_bytes,
            model_bytes_memory_limit: modelSizeStats.model_bytes_memory_limit,
            peak_model_bytes: modelSizeStats.peak_model_bytes,
            model_bytes_exceeded: modelSizeStats.model_bytes_exceeded,
          };
        });
    },
    /**
     * Returns annotations about delayed data.
     *
     * @param jobIds
     * @param timeInterval - Custom time interval provided by the user.
     * @param previousStartedAt - Date object of the previous rule execution time.
     * @param bucketSpans - Bucket spans from the jobs configurations.
     * @param docsCount - The threshold for a number of missing documents to alert upon.
     */
    async getDelayedDataReport(
      jobIds: string[],
      timeInterval: string | null,
      previousStartedAt: Date | null,
      bucketSpans: string[],
      docsCount: number | null
    ): Promise<DelayedDataResponse[]> {
      const earliestMs = getDelayedDataLookbackTimestamp(
        timeInterval,
        bucketSpans,
        previousStartedAt
      );

      let annotations: DelayedDataResponse[] = (
        await annotationService.getDelayedDataAnnotations({
          jobIds,
          earliestMs,
        })
      ).map<DelayedDataResponse>((v) => {
        const match = v.annotation.match(/Datafeed has missed (\d+)\s/);
        const missedDocsCount = match ? parseInt(match[1], 10) : 0;
        return {
          annotation: v.annotation,
          end_timestamp: v.end_timestamp,
          missed_docs_count: missedDocsCount,
          job_id: v.job_id,
        };
      });

      if (docsCount) {
        annotations = annotations.filter(
          ({ missed_docs_count: missedDocsCount }) => missedDocsCount >= docsCount
        );
      }

      return annotations;
    },
    /**
     * Retrieves report grouped by test.
     */
    async getTestsResults(
      ruleInstanceName: string,
      { testsConfig, includeJobs, excludeJobs }: AnomalyDetectionJobsHealthRuleParams,
      previousStartedAt: Date | null
    ): Promise<TestsResults> {
      const config = getResultJobsHealthRuleConfig(testsConfig);

      const results: TestsResults = [];

      const jobs = await getResultJobs(includeJobs, excludeJobs);
      const jobIds = jobs.map((job) => job.job_id);

      if (jobIds.length === 0) {
        logger.warn(`Rule "${ruleInstanceName}" does not have associated jobs.`);
        return results;
      }

      logger.debug(`Performing health checks for job IDs: ${jobIds.join(', ')}`);

      if (config.datafeed.enabled) {
        const response = await this.getNotStartedDatafeeds(jobIds);
        if (response && response.length > 0) {
          results.push({
            name: HEALTH_CHECK_NAMES.datafeed.name,
            context: {
              results: response,
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

      if (config.mml.enabled) {
        const response = await this.getMmlReport(jobIds);
        if (response && response.length > 0) {
          const hardLimitJobsCount = response.reduce((acc, curr) => {
            return acc + (curr.memory_status === 'hard_limit' ? 1 : 0);
          }, 0);

          results.push({
            name: HEALTH_CHECK_NAMES.mml.name,
            context: {
              results: response,
              message:
                hardLimitJobsCount > 0
                  ? i18n.translate(
                      'xpack.ml.alertTypes.jobsHealthAlertingRule.mmlHardLimitMessage',
                      {
                        defaultMessage:
                          '{jobsCount, plural, one {# job} other {# jobs}} reached the hard model memory limit. Assign the job more memory and restore from a snapshot from prior to reaching the hard limit.',
                        values: { jobsCount: hardLimitJobsCount },
                      }
                    )
                  : i18n.translate(
                      'xpack.ml.alertTypes.jobsHealthAlertingRule.mmlSoftLimitMessage',
                      {
                        defaultMessage:
                          '{jobsCount, plural, one {# job} other {# jobs}} reached the soft model memory limit. Assign the job more memory or edit the datafeed filter to limit scope of analysis.',
                        values: { jobsCount: response.length },
                      }
                    ),
            },
          });
        }
      }

      if (config.delayedData.enabled) {
        const bucketsLength = jobs.map((v) => v.analysis_config.bucket_span);

        const response = await this.getDelayedDataReport(
          jobIds,
          config.delayedData.timeInterval,
          previousStartedAt,
          bucketsLength,
          config.delayedData.docsCount
        );

        if (response.length > 0) {
          results.push({
            name: HEALTH_CHECK_NAMES.delayedData.name,
            context: {
              results: response,
              message: i18n.translate(
                'xpack.ml.alertTypes.jobsHealthAlertingRule.delayedDataMessage',
                {
                  defaultMessage:
                    '{jobsCount, plural, one {# job is} other {# jobs are}} suffering from delayed data.',
                  values: { jobsCount: response.length },
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
                annotationServiceProvider(scopedClient),
                logger
              ).getTestsResults(...args)
            );
        },
      };
    },
  };
}

export type JobsHealthServiceProvider = ReturnType<typeof getJobsHealthServiceProvider>;
