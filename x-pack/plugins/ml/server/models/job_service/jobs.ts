/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import Boom from '@hapi/boom';
import { IScopedClusterClient } from 'kibana/server';
import {
  getSingleMetricViewerJobErrorMessage,
  parseTimeIntervalForJob,
} from '../../../common/util/job_utils';
import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';
import {
  MlSummaryJob,
  AuditMessage,
  Job,
  JobStats,
  DatafeedWithStats,
  CombinedJobWithStats,
} from '../../../common/types/anomaly_detection_jobs';
import { GLOBAL_CALENDAR } from '../../../common/constants/calendars';
import { datafeedsProvider, MlDatafeedsResponse, MlDatafeedsStatsResponse } from './datafeeds';
import { jobAuditMessagesProvider } from '../job_audit_messages';
import { resultsServiceProvider } from '../results_service';
import { CalendarManager } from '../calendar';
import { fillResultsWithTimeouts, isRequestTimeout } from './error_utils';
import {
  getEarliestDatafeedStartTime,
  getLatestDataOrBucketTimestamp,
} from '../../../common/util/job_utils';
import { groupsProvider } from './groups';
import type { MlClient } from '../../lib/ml_client';

export interface MlJobsResponse {
  jobs: Job[];
  count: number;
}

export interface MlJobsStatsResponse {
  jobs: JobStats[];
  count: number;
}

interface Results {
  [id: string]: {
    [status: string]: boolean;
    error?: any;
  };
}

export function jobsProvider(client: IScopedClusterClient, mlClient: MlClient) {
  const { asInternalUser } = client;

  const { forceDeleteDatafeed, getDatafeedIdsByJobId } = datafeedsProvider(mlClient);
  const { getAuditMessagesSummary } = jobAuditMessagesProvider(client, mlClient);
  const { getLatestBucketTimestampByJob } = resultsServiceProvider(mlClient);
  const calMngr = new CalendarManager(mlClient);

  async function forceDeleteJob(jobId: string) {
    await mlClient.deleteJob({ job_id: jobId, force: true, wait_for_completion: false });
  }

  async function deleteJobs(jobIds: string[]) {
    const results: Results = {};
    const datafeedIds = await getDatafeedIdsByJobId();

    for (const jobId of jobIds) {
      try {
        const datafeedResp =
          datafeedIds[jobId] === undefined
            ? { acknowledged: true }
            : await forceDeleteDatafeed(datafeedIds[jobId]);

        if (datafeedResp.acknowledged) {
          try {
            await forceDeleteJob(jobId);
            results[jobId] = { deleted: true };
          } catch (error) {
            if (isRequestTimeout(error)) {
              return fillResultsWithTimeouts(results, jobId, jobIds, DATAFEED_STATE.DELETED);
            }
            results[jobId] = { deleted: false, error: error.body };
          }
        }
      } catch (error) {
        if (isRequestTimeout(error)) {
          return fillResultsWithTimeouts(
            results,
            datafeedIds[jobId],
            jobIds,
            DATAFEED_STATE.DELETED
          );
        }
        results[jobId] = { deleted: false, error: error.body };
      }
    }
    return results;
  }

  async function closeJobs(jobIds: string[]) {
    const results: Results = {};
    for (const jobId of jobIds) {
      try {
        await mlClient.closeJob({ job_id: jobId });
        results[jobId] = { closed: true };
      } catch (error) {
        if (isRequestTimeout(error)) {
          return fillResultsWithTimeouts(results, jobId, jobIds, JOB_STATE.CLOSED);
        }

        if (
          error.statusCode === 409 &&
          error.body.error?.reason &&
          error.body.error.reason.includes('datafeed') === false
        ) {
          // the close job request may fail (409) if the job has failed or if the datafeed hasn't been stopped.
          // if the job has failed we want to attempt a force close.
          // however, if we received a 409 due to the datafeed being started we should not attempt a force close.
          try {
            await mlClient.closeJob({ job_id: jobId, force: true });
            results[jobId] = { closed: true };
          } catch (error2) {
            if (isRequestTimeout(error2)) {
              return fillResultsWithTimeouts(results, jobId, jobIds, JOB_STATE.CLOSED);
            }
            results[jobId] = { closed: false, error: error2.body };
          }
        } else {
          results[jobId] = { closed: false, error: error.body };
        }
      }
    }
    return results;
  }

  async function forceStopAndCloseJob(jobId: string) {
    const datafeedIds = await getDatafeedIdsByJobId();
    const datafeedId = datafeedIds[jobId];
    if (datafeedId === undefined) {
      throw Boom.notFound(`Cannot find datafeed for job ${jobId}`);
    }

    const { body } = await mlClient.stopDatafeed({ datafeed_id: datafeedId, force: true });
    if (body.stopped !== true) {
      return { success: false };
    }

    await mlClient.closeJob({ job_id: jobId, force: true });

    return { success: true };
  }

  async function jobsSummary(jobIds: string[] = []) {
    const fullJobsList: CombinedJobWithStats[] = await createFullJobsList();
    const fullJobsIds = fullJobsList.map((job) => job.job_id);
    let auditMessagesByJob: { [id: string]: AuditMessage } = {};

    // even if there are errors getting the audit messages, we still want to show the full list
    try {
      const auditMessages: AuditMessage[] = await getAuditMessagesSummary(fullJobsIds);
      auditMessagesByJob = auditMessages.reduce((acc, cur) => {
        acc[cur.job_id] = cur;
        return acc;
      }, auditMessagesByJob);
    } catch (e) {
      // fail silently
    }

    const deletingStr = i18n.translate('xpack.ml.models.jobService.deletingJob', {
      defaultMessage: 'deleting',
    });

    const jobs = fullJobsList.map((job) => {
      const hasDatafeed =
        typeof job.datafeed_config === 'object' && Object.keys(job.datafeed_config).length > 0;
      const dataCounts = job.data_counts;
      const errorMessage = getSingleMetricViewerJobErrorMessage(job);

      const tempJob: MlSummaryJob = {
        id: job.job_id,
        description: job.description || '',
        groups: Array.isArray(job.groups) ? job.groups.sort() : [],
        processed_record_count: job.data_counts?.processed_record_count,
        earliestStartTimestampMs: getEarliestDatafeedStartTime(
          dataCounts?.latest_record_timestamp,
          dataCounts?.latest_bucket_timestamp,
          parseTimeIntervalForJob(job.analysis_config?.bucket_span)
        ),
        memory_status: job.model_size_stats ? job.model_size_stats.memory_status : '',
        jobState: job.deleting === true ? deletingStr : job.state,
        hasDatafeed,
        datafeedId:
          hasDatafeed && job.datafeed_config.datafeed_id ? job.datafeed_config.datafeed_id : '',
        datafeedIndices:
          hasDatafeed && job.datafeed_config.indices ? job.datafeed_config.indices : [],
        datafeedState: hasDatafeed && job.datafeed_config.state ? job.datafeed_config.state : '',
        latestTimestampMs: dataCounts?.latest_record_timestamp,
        earliestTimestampMs: dataCounts?.earliest_record_timestamp,
        latestResultsTimestampMs: getLatestDataOrBucketTimestamp(
          dataCounts?.latest_record_timestamp,
          dataCounts?.latest_bucket_timestamp
        ),
        isSingleMetricViewerJob: errorMessage === undefined,
        isNotSingleMetricViewerJobMessage: errorMessage,
        nodeName: job.node ? job.node.name : undefined,
        deleting: job.deleting || undefined,
      };
      if (jobIds.find((j) => j === tempJob.id)) {
        tempJob.fullJob = job;
      }
      const auditMessage = auditMessagesByJob[tempJob.id];
      if (
        auditMessage !== undefined &&
        job.create_time !== undefined &&
        job.create_time <= auditMessage.msgTime
      ) {
        tempJob.auditMessage = {
          level: auditMessage.highestLevel,
          text: auditMessage.highestLevelText,
        };
      }
      return tempJob;
    });

    return jobs;
  }

  async function jobsWithTimerange() {
    const fullJobsList = await createFullJobsList();
    const jobsMap: { [id: string]: string[] } = {};

    const jobs = fullJobsList.map((job) => {
      jobsMap[job.job_id] = job.groups || [];
      const hasDatafeed =
        typeof job.datafeed_config === 'object' && Object.keys(job.datafeed_config).length > 0;
      const timeRange: { to?: number; from?: number } = {};

      const dataCounts = job.data_counts;
      if (dataCounts !== undefined) {
        timeRange.to = getLatestDataOrBucketTimestamp(
          dataCounts.latest_record_timestamp as number,
          dataCounts.latest_bucket_timestamp as number
        );
        timeRange.from = dataCounts.earliest_record_timestamp;
      }
      const errorMessage = getSingleMetricViewerJobErrorMessage(job);

      const tempJob = {
        id: job.job_id,
        job_id: job.job_id,
        groups: Array.isArray(job.groups) ? job.groups.sort() : [],
        isRunning: hasDatafeed && job.datafeed_config.state === 'started',
        isSingleMetricViewerJob: errorMessage === undefined,
        isNotSingleMetricViewerJobMessage: errorMessage,
        timeRange,
      };

      return tempJob;
    });

    return { jobs, jobsMap };
  }

  async function createFullJobsList(jobIds: string[] = []) {
    const jobs: CombinedJobWithStats[] = [];
    const groups: { [jobId: string]: string[] } = {};
    const datafeeds: { [id: string]: DatafeedWithStats } = {};
    const calendarsByJobId: { [jobId: string]: string[] } = {};
    const globalCalendars: string[] = [];

    const jobIdsString = jobIds.join();
    const [
      { body: jobResults },
      { body: jobStatsResults },
      { body: datafeedResults },
      { body: datafeedStatsResults },
      calendarResults,
      latestBucketTimestampByJob,
    ] = await Promise.all([
      mlClient.getJobs<MlJobsResponse>(jobIds.length > 0 ? { job_id: jobIdsString } : undefined),
      mlClient.getJobStats<MlJobsStatsResponse>(
        jobIds.length > 0 ? { job_id: jobIdsString } : undefined
      ),
      mlClient.getDatafeeds<MlDatafeedsResponse>(),
      mlClient.getDatafeedStats<MlDatafeedsStatsResponse>(),
      calMngr.getAllCalendars(),
      getLatestBucketTimestampByJob(),
    ]);

    if (datafeedResults && datafeedResults.datafeeds) {
      datafeedResults.datafeeds.forEach((datafeed) => {
        if (datafeedStatsResults && datafeedStatsResults.datafeeds) {
          const datafeedStats = datafeedStatsResults.datafeeds.find(
            (ds) => ds.datafeed_id === datafeed.datafeed_id
          );
          if (datafeedStats) {
            datafeeds[datafeed.job_id] = { ...datafeed, ...datafeedStats };
          }
        }
      });
    }

    // create list of jobs per group.
    // used for assigning calendars to jobs when a calendar has
    // only been attached to a group
    if (jobResults && jobResults.jobs) {
      jobResults.jobs.forEach((job) => {
        calendarsByJobId[job.job_id] = [];

        if (job.groups !== undefined) {
          job.groups.forEach((gId) => {
            if (groups[gId] === undefined) {
              groups[gId] = [];
            }
            groups[gId].push(job.job_id);
          });
        }
      });
    }

    // assign calendars to jobs
    if (calendarResults) {
      calendarResults.forEach((cal) => {
        cal.job_ids.forEach((id) => {
          if (id === GLOBAL_CALENDAR) {
            globalCalendars.push(cal.calendar_id);
          } else if (groups[id]) {
            groups[id].forEach((jId) => {
              if (calendarsByJobId[jId] !== undefined) {
                calendarsByJobId[jId].push(cal.calendar_id);
              }
            });
          } else {
            if (calendarsByJobId[id] !== undefined) {
              calendarsByJobId[id].push(cal.calendar_id);
            }
          }
        });
      });

      // de-duplicate calendars
      for (const cal in calendarsByJobId) {
        if (calendarsByJobId.hasOwnProperty(cal)) {
          calendarsByJobId[cal] = uniq(calendarsByJobId[cal]);
        }
      }
    }

    // create jobs objects containing job stats, datafeeds, datafeed stats and calendars
    if (jobResults && jobResults.jobs) {
      jobResults.jobs.forEach((job) => {
        let tempJob = job as CombinedJobWithStats;

        const calendars: string[] = [
          ...(calendarsByJobId[tempJob.job_id] || []),
          ...(globalCalendars || []),
        ];
        if (calendars.length) {
          tempJob.calendars = calendars;
        }

        if (jobStatsResults && jobStatsResults.jobs) {
          const jobStats = jobStatsResults.jobs.find((js) => js.job_id === tempJob.job_id);
          if (jobStats !== undefined) {
            tempJob = { ...tempJob, ...jobStats };
            if (jobStats.node) {
              tempJob.node = jobStats.node;
            }
            if (jobStats.open_time) {
              tempJob.open_time = jobStats.open_time;
            }

            // Add in the timestamp of the last bucket processed for each job if available.
            const latestBucketTimestamp =
              latestBucketTimestampByJob && latestBucketTimestampByJob[tempJob.job_id];
            if (latestBucketTimestamp) {
              tempJob.data_counts.latest_bucket_timestamp = latestBucketTimestamp;
            }
          }
        }

        const datafeed = datafeeds[tempJob.job_id];
        if (datafeed !== undefined) {
          tempJob.datafeed_config = datafeed;
        }

        jobs.push(tempJob);
      });
    }
    return jobs;
  }

  async function deletingJobTasks() {
    const actions = ['cluster:admin/xpack/ml/job/delete'];
    const detailed = true;
    const jobIds: string[] = [];
    try {
      const { body } = await asInternalUser.tasks.list({ actions, detailed });
      Object.keys(body.nodes).forEach((nodeId) => {
        const tasks = body.nodes[nodeId].tasks;
        Object.keys(tasks).forEach((taskId) => {
          jobIds.push(tasks[taskId].description.replace(/^delete-job-/, ''));
        });
      });
    } catch (e) {
      // if the user doesn't have permission to load the task list,
      // use the jobs list to get the ids of deleting jobs
      const {
        body: { jobs },
      } = await mlClient.getJobs<MlJobsResponse>();

      jobIds.push(...jobs.filter((j) => j.deleting === true).map((j) => j.job_id));
    }
    return { jobIds };
  }

  // Checks if each of the jobs in the specified list of IDs exist.
  // Job IDs in supplied array may contain wildcard '*' characters
  // e.g. *_low_request_rate_ecs
  async function jobsExist(jobIds: string[] = [], allSpaces: boolean = false) {
    const results: { [id: string]: boolean } = {};
    for (const jobId of jobIds) {
      try {
        const { body } = allSpaces
          ? await client.asInternalUser.ml.getJobs<MlJobsResponse>({
              job_id: jobId,
            })
          : await mlClient.getJobs<MlJobsResponse>({
              job_id: jobId,
            });
        results[jobId] = body.count > 0;
      } catch (e) {
        // if a non-wildcarded job id is supplied, the get jobs endpoint will 404
        if (e.statusCode !== 404) {
          throw e;
        }
        results[jobId] = false;
      }
    }
    return results;
  }

  async function getAllJobAndGroupIds() {
    const { getAllGroups } = groupsProvider(mlClient);
    const { body } = await mlClient.getJobs<MlJobsResponse>();
    const jobIds = body.jobs.map((job) => job.job_id);
    const groups = await getAllGroups();
    const groupIds = groups.map((group) => group.id);

    return {
      jobIds,
      groupIds,
    };
  }

  async function getLookBackProgress(jobId: string, start: number, end: number) {
    const datafeedId = `datafeed-${jobId}`;
    const [{ body }, isRunning] = await Promise.all([
      mlClient.getJobStats<MlJobsStatsResponse>({ job_id: jobId }),
      isDatafeedRunning(datafeedId),
    ]);

    if (body.jobs.length) {
      const statsForJob = body.jobs[0];
      const time = statsForJob.data_counts.latest_record_timestamp;
      const progress = (time - start) / (end - start);
      const isJobClosed = statsForJob.state === JOB_STATE.CLOSED;
      return {
        progress: progress > 0 ? Math.round(progress * 100) : 0,
        isRunning,
        isJobClosed,
      };
    }
    return { progress: 0, isRunning: false, isJobClosed: true };
  }

  async function isDatafeedRunning(datafeedId: string) {
    const { body } = await mlClient.getDatafeedStats<MlDatafeedsStatsResponse>({
      datafeed_id: datafeedId,
    });
    if (body.datafeeds.length) {
      const state = body.datafeeds[0].state;
      return (
        state === DATAFEED_STATE.STARTED ||
        state === DATAFEED_STATE.STARTING ||
        state === DATAFEED_STATE.STOPPING
      );
    }
    return false;
  }

  return {
    forceDeleteJob,
    deleteJobs,
    closeJobs,
    forceStopAndCloseJob,
    jobsSummary,
    jobsWithTimerange,
    createFullJobsList,
    deletingJobTasks,
    jobsExist,
    getAllJobAndGroupIds,
    getLookBackProgress,
  };
}
