/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, keyBy, memoize, partition } from 'lodash';
import { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { MlJob } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isDefined } from '@kbn/ml-is-defined';
import { MlClient } from '../ml_client';
import { JobSelection } from '../../routes/schemas/alerting_schema';
import { datafeedsProvider, DatafeedsService } from '../../models/job_service/datafeeds';
import { ALL_JOBS_SELECTION, HEALTH_CHECK_NAMES } from '../../../common/constants/alerts';
import { DatafeedStats } from '../../../common/types/anomaly_detection_jobs';
import { GetGuards } from '../../shared_services/shared_services';
import {
  AnomalyDetectionJobsHealthAlertContext,
  DelayedDataResponse,
  JobsErrorsResponse,
  JobsHealthExecutorOptions,
  MmlTestResponse,
  NotStartedDatafeedResponse,
} from './register_jobs_monitoring_rule_type';
import {
  getResultJobsHealthRuleConfig,
  resolveLookbackInterval,
} from '../../../common/util/alerts';
import { AnnotationService } from '../../models/annotation_service/annotation';
import { annotationServiceProvider } from '../../models/annotation_service';
import { parseInterval } from '../../../common/util/parse_interval';
import {
  jobAuditMessagesProvider,
  JobAuditMessagesService,
} from '../../models/job_audit_messages/job_audit_messages';
import type { FieldFormatsRegistryProvider } from '../../../common/types/kibana';

export interface TestResult {
  name: string;
  context: AnomalyDetectionJobsHealthAlertContext;
  /**
   * Indicates if the health check is  successful.
   */
  isHealthy: boolean;
}

type TestsResults = TestResult[];

export function jobsHealthServiceProvider(
  mlClient: MlClient,
  datafeedsService: DatafeedsService,
  annotationService: AnnotationService,
  jobAuditMessagesService: JobAuditMessagesService,
  getFieldsFormatRegistry: FieldFormatsRegistryProvider,
  logger: Logger
) {
  /**
   * Provides a callback for date formatting based on the Kibana settings.
   */
  const getFormatters = memoize(async () => {
    const fieldFormatsRegistry = await getFieldsFormatRegistry();
    const dateFormatter = fieldFormatsRegistry.deserialize({ id: 'date' });
    const bytesFormatter = fieldFormatsRegistry.deserialize({ id: 'bytes' });
    return {
      dateFormatter: dateFormatter.convert.bind(dateFormatter),
      bytesFormatter: bytesFormatter.convert.bind(bytesFormatter),
    };
  });

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
    ).jobs;

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
      ).jobs;

      const excludedJobsIds: Set<string> = new Set(excludedJobsResponse.map((v) => v.job_id));

      resultJobs = resultJobs.filter((v) => !excludedJobsIds.has(v.job_id));
    }

    return resultJobs;
  };

  /**
   * Resolves the timestamp for delayed data check.
   *
   * @param timeInterval - Custom time interval provided by the user.
   * @param defaultLookbackInterval - Interval derived from the jobs and datefeeds configs.
   */
  const getDelayedDataLookbackTimestamp = (
    timeInterval: string | null,
    defaultLookbackInterval: string
  ): number => {
    const currentTimestamp = Date.now();

    const defaultLookbackTimestamp =
      currentTimestamp - parseInterval(defaultLookbackInterval)!.asMilliseconds();

    const customIntervalOffsetTimestamp = timeInterval
      ? currentTimestamp - parseInterval(timeInterval)!.asMilliseconds()
      : null;

    return Math.min(...[defaultLookbackTimestamp, customIntervalOffsetTimestamp].filter(isDefined));
  };

  const getJobIds = memoize((jobs: MlJob[]) => jobs.map((j) => j.job_id));

  const getDatafeeds = memoize(datafeedsService.getDatafeedByJobId);

  const getJobStats = memoize(
    async (jobIds: string[]) => (await mlClient.getJobStats({ job_id: jobIds.join(',') })).jobs
  );

  /** Gets values for translation string */
  const getJobsAlertingMessageValues = <T extends Array<{ job_id: string } | undefined>>(
    results: T
  ) => {
    const jobIds = (results || []).filter(isDefined).map((v) => v.job_id);
    return {
      count: jobIds.length,
      jobsString: jobIds.join(', '),
    };
  };

  return {
    /**
     * Gets not started datafeeds for opened jobs.
     * @param jobIds
     */
    async getDatafeedsReport(jobIds: string[]): Promise<NotStartedDatafeedResponse[] | void> {
      const datafeeds = await getDatafeeds(jobIds);

      if (datafeeds) {
        const jobsStats = await getJobStats(jobIds);

        const { datafeeds: datafeedsStats } = await mlClient.getDatafeedStats({
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
            // Find opened jobs
            return datafeedStat.job_state === 'opened';
          });
      }
    },
    /**
     * Gets the model memory report for opened jobs.
     * @param jobIds
     */
    async getMmlReport(jobIds: string[]): Promise<MmlTestResponse[]> {
      const jobsStats = await getJobStats(jobIds);

      const { dateFormatter, bytesFormatter } = await getFormatters();

      return jobsStats
        .filter((j) => j.state === 'opened')
        .map(({ job_id: jobId, model_size_stats: modelSizeStats }) => {
          return {
            job_id: jobId,
            memory_status: modelSizeStats.memory_status,
            log_time: dateFormatter(modelSizeStats.log_time),
            model_bytes: bytesFormatter(modelSizeStats.model_bytes),
            model_bytes_memory_limit: bytesFormatter(modelSizeStats.model_bytes_memory_limit),
            peak_model_bytes: bytesFormatter(modelSizeStats.peak_model_bytes),
            model_bytes_exceeded: bytesFormatter(modelSizeStats.model_bytes_exceeded),
          };
        });
    },
    /**
     * Returns annotations about delayed data.
     *
     * @param jobs
     * @param timeInterval - Custom time interval provided by the user.
     * @param docsCount - The threshold for a number of missing documents to alert upon.
     *
     * @return {Promise<[DelayedDataResponse[], DelayedDataResponse[]]>} - Collections of annotations exceeded and not exceeded the docs threshold.
     */
    async getDelayedDataReport(
      jobs: MlJob[],
      timeInterval: string | null,
      docsCount: number | null
    ): Promise<[DelayedDataResponse[], DelayedDataResponse[]]> {
      const jobIds = getJobIds(jobs);
      const datafeeds = await getDatafeeds(jobIds);

      const datafeedsMap = keyBy(datafeeds, 'job_id');

      // We shouldn't check jobs that don't have associated datafeeds
      const resultJobs = jobs.filter((j) => datafeedsMap[j.job_id] !== undefined);
      const resultJobIds = getJobIds(resultJobs);
      const jobsMap = keyBy(resultJobs, 'job_id');

      const defaultLookbackInterval = resolveLookbackInterval(resultJobs, datafeeds!);
      const earliestMs = getDelayedDataLookbackTimestamp(timeInterval, defaultLookbackInterval);

      const { dateFormatter } = await getFormatters();

      const annotationsData = (
        await annotationService.getDelayedDataAnnotations({
          jobIds: resultJobIds,
          earliestMs,
        })
      )
        .map((v) => {
          // TODO Update when https://github.com/elastic/elasticsearch/issues/76088 is resolved.
          const match = v.annotation.match(/Datafeed has missed (\d+)\s/);
          const missedDocsCount = match ? parseInt(match[1], 10) : 0;
          return {
            annotation: v.annotation,
            // end_timestamp is always defined for delayed_data annotation
            end_timestamp: v.end_timestamp!,
            missed_docs_count: missedDocsCount,
            job_id: v.job_id,
          };
        })
        .filter((v) => {
          // As we retrieved annotations based on the longest bucket span and query delay,
          // we need to check end_timestamp against appropriate job configuration.

          const job = jobsMap[v.job_id];
          const datafeed = datafeedsMap[v.job_id];

          const jobLookbackInterval = resolveLookbackInterval([job], [datafeed]);

          const isEndTimestampWithinRange =
            v.end_timestamp > getDelayedDataLookbackTimestamp(timeInterval, jobLookbackInterval);

          return isEndTimestampWithinRange;
        })
        .map((v) => {
          return {
            ...v,
            end_timestamp: dateFormatter(v.end_timestamp),
          };
        });

      return partition(annotationsData, (v) => {
        const isDocCountExceededThreshold = docsCount ? v.missed_docs_count >= docsCount : true;
        return isDocCountExceededThreshold;
      });
    },
    /**
     * Retrieves a list of the latest errors per jobs.
     * @param jobIds List of job IDs.
     * @param previousStartedAt Time of the previous rule execution. As we intend to notify
     *                          about an error only once, limit the scope of the errors search.
     */
    async getErrorsReport(
      jobIds: string[],
      previousStartedAt: Date
    ): Promise<JobsErrorsResponse[]> {
      const { dateFormatter } = await getFormatters();

      return (
        await jobAuditMessagesService.getJobsErrorMessages(jobIds, previousStartedAt.getTime())
      ).map((v) => {
        return {
          ...v,
          errors: v.errors.map((e) => {
            return {
              ...e,
              timestamp: dateFormatter(e.timestamp),
            };
          }),
        };
      });
    },
    /**
     * Retrieves report grouped by test.
     */
    async getTestsResults(executorOptions: JobsHealthExecutorOptions): Promise<TestsResults> {
      const {
        rule,
        previousStartedAt,
        params: { testsConfig, includeJobs, excludeJobs },
      } = executorOptions;

      const config = getResultJobsHealthRuleConfig(testsConfig);

      const results: TestsResults = [];

      const jobs = await getResultJobs(includeJobs, excludeJobs);
      const jobIds = getJobIds(jobs);

      if (jobIds.length === 0) {
        logger.warn(`Rule "${rule.name}" does not have associated jobs.`);
        return results;
      }

      logger.debug(`Performing health checks for job IDs: ${jobIds.join(', ')}`);

      if (config.datafeed.enabled) {
        const response = await this.getDatafeedsReport(jobIds);
        if (response && response.length > 0) {
          const [startedDatafeeds, notStartedDatafeeds] = partition(
            response,
            (datafeedStat) => datafeedStat.datafeed_state === 'started'
          );

          const isHealthy = notStartedDatafeeds.length === 0;
          const datafeedResults = isHealthy ? startedDatafeeds : notStartedDatafeeds;
          const { count, jobsString } = getJobsAlertingMessageValues(datafeedResults);

          results.push({
            isHealthy,
            name: HEALTH_CHECK_NAMES.datafeed.name,
            context: {
              results: datafeedResults,
              message: isHealthy
                ? i18n.translate(
                    'xpack.ml.alertTypes.jobsHealthAlertingRule.datafeedRecoveryMessage',
                    {
                      defaultMessage:
                        'Datafeed is started for {count, plural, one {job} other {jobs}} {jobsString}',
                      values: { count, jobsString },
                    }
                  )
                : i18n.translate(
                    'xpack.ml.alertTypes.jobsHealthAlertingRule.datafeedStateMessage',
                    {
                      defaultMessage:
                        'Datafeed is not started for {count, plural, one {job} other {jobs}} {jobsString}',
                      values: { count, jobsString },
                    }
                  ),
            },
          });
        }
      }

      if (config.mml.enabled) {
        const response = await this.getMmlReport(jobIds);
        if (response && response.length > 0) {
          const {
            hard_limit: hardLimitJobs,
            soft_limit: softLimitJobs,
            ok: okJobs,
          } = groupBy(response, 'memory_status');

          const isHealthy = !hardLimitJobs?.length && !softLimitJobs?.length;

          let message = '';

          if (isHealthy) {
            message = i18n.translate(
              'xpack.ml.alertTypes.jobsHealthAlertingRule.mmlRecoveredMessage',
              {
                defaultMessage: `All jobs are running within configured model memory limits.`,
              }
            );
          } else {
            const { count: hardLimitCount, jobsString: hardLimitJobsString } =
              getJobsAlertingMessageValues(hardLimitJobs);
            const { count: softLimitCount, jobsString: softLimitJobsString } =
              getJobsAlertingMessageValues(softLimitJobs);

            if (hardLimitCount > 0) {
              message = i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.mmlMessage', {
                defaultMessage: `{count, plural, one {Job} other {Jobs}} {jobsString} reached the hard model memory limit. Assign more memory to the job and restore it from a snapshot taken prior to reaching the hard limit.`,
                values: {
                  count: hardLimitCount,
                  jobsString: hardLimitJobsString,
                },
              });
            }

            if (softLimitCount > 0) {
              if (message.length > 0) {
                message += '\n';
              }
              message += i18n.translate(
                'xpack.ml.alertTypes.jobsHealthAlertingRule.mmlSoftLimitMessage',
                {
                  defaultMessage:
                    '{count, plural, one {Job} other {Jobs}} {jobsString} reached the soft model memory limit. Assign more memory to the job or edit the datafeed filter to limit the scope of analysis.',
                  values: {
                    count: softLimitCount,
                    jobsString: softLimitJobsString,
                  },
                }
              );
            }
          }

          results.push({
            isHealthy,
            name: HEALTH_CHECK_NAMES.mml.name,
            context: {
              results: isHealthy ? okJobs : [...(hardLimitJobs ?? []), ...(softLimitJobs ?? [])],
              message,
            },
          });
        }
      }

      if (config.delayedData.enabled) {
        const [exceededThresholdAnnotations, withinThresholdAnnotations] =
          await this.getDelayedDataReport(
            jobs,
            config.delayedData.timeInterval,
            config.delayedData.docsCount
          );

        const isHealthy = exceededThresholdAnnotations.length === 0;
        const { count, jobsString } = getJobsAlertingMessageValues(exceededThresholdAnnotations);

        results.push({
          isHealthy,
          name: HEALTH_CHECK_NAMES.delayedData.name,
          context: {
            results: isHealthy ? withinThresholdAnnotations : exceededThresholdAnnotations,
            message: isHealthy
              ? i18n.translate(
                  'xpack.ml.alertTypes.jobsHealthAlertingRule.delayedDataRecoveryMessage',
                  {
                    defaultMessage: 'No data delay has occurred.',
                  }
                )
              : i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.delayedDataMessage', {
                  defaultMessage:
                    '{count, plural, one {Job} other {Jobs}} {jobsString} {count, plural, one {is} other {are}} suffering from delayed data.',
                  values: { count, jobsString },
                }),
          },
        });
      }

      if (config.errorMessages.enabled && previousStartedAt) {
        const response = await this.getErrorsReport(jobIds, previousStartedAt);
        const { count, jobsString } = getJobsAlertingMessageValues(response);
        const isHealthy = response.length === 0;

        results.push({
          isHealthy,
          name: HEALTH_CHECK_NAMES.errorMessages.name,
          context: {
            results: response,
            message: isHealthy
              ? i18n.translate(
                  'xpack.ml.alertTypes.jobsHealthAlertingRule.errorMessagesRecoveredMessage',
                  {
                    defaultMessage:
                      'No errors in the {count, plural, one {job} other {jobs}} messages.',
                    values: { count },
                  }
                )
              : i18n.translate('xpack.ml.alertTypes.jobsHealthAlertingRule.errorMessagesMessage', {
                  defaultMessage:
                    '{count, plural, one {Job} other {Jobs}} {jobsString} {count, plural, one {contains} other {contain}} errors in the messages.',
                  values: { count, jobsString },
                }),
          },
        });
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
            .ok(({ mlClient, scopedClient, getFieldsFormatRegistry }) =>
              jobsHealthServiceProvider(
                mlClient,
                datafeedsProvider(scopedClient, mlClient),
                annotationServiceProvider(scopedClient),
                jobAuditMessagesProvider(scopedClient, mlClient),
                getFieldsFormatRegistry,
                logger
              ).getTestsResults(...args)
            );
        },
      };
    },
  };
}

export type JobsHealthServiceProvider = ReturnType<typeof getJobsHealthServiceProvider>;
